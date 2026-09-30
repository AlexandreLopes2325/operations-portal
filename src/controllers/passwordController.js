const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');
const { escapeHtml } = require('../lib/html');

const RESET_CODE_BYTES = 16;              // 16 bytes = 32 caracteres hex
const RESET_EXPIRATION_MINUTES = 15;
const MAX_RESET_ATTEMPTS = 5;

// Só o hash do código vai pro banco; o código em si só existe no e-mail
const hashResetCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Compara dois hashes hex em tempo constante
const hashesMatch = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
};

// Configurar email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Solicitar reset de senha
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuário
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (!user) {
      return res.json({ message: 'Se o email existir, enviaremos um código de recuperação.' });
    }

    // Invalida códigos anteriores ainda não usados - só o mais recente vale
    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Gerar código aleatório e guardar só o hash
    const code = crypto.randomBytes(RESET_CODE_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_EXPIRATION_MINUTES * 60 * 1000);

    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        user_id: user.id,
        token_hash: hashResetCode(code),
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        used: false
      });

    if (insertError) {
      console.error('Erro ao salvar código de recuperação:', insertError.message);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Enviar email
    await transporter.sendMail({
      from: `"Operations Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Recuperação de Senha - Operations Portal',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Olá ${escapeHtml(user.name)},</p>
        <p>Você solicitou a recuperação de senha.</p>
        <p>Seu código de recuperação é (copie e cole):</p>
        <p style="background: #f0f0f0; padding: 12px; text-align: center; font-family: monospace; font-size: 18px; letter-spacing: 1px; word-break: break-all;">${code}</p>
        <p>Este código expira em <strong>${RESET_EXPIRATION_MINUTES} minutos</strong>, só pode ser usado uma vez
        e é invalidado após ${MAX_RESET_ATTEMPTS} tentativas erradas.</p>
        <p>Se você não solicitou, ignore este email.</p>
        <br>
        <p>— Operations Portal</p>
      `
    });

    await logAction(user.id, 'PASSWORD_RESET_REQUEST', { email }, req.ip);

    res.json({ message: 'Se o email existir, enviaremos um código de recuperação.' });

  } catch (err) {
    console.error('Erro no forgot password:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Resetar senha com o código recebido por e-mail
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const invalid = () => res.status(400).json({ error: 'Código inválido ou expirado' });

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      return invalid();
    }

    const { data: resetData } = await supabase
      .from('password_resets')
      .select('id, token_hash, expires_at, attempts')
      .eq('user_id', user.id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!resetData) {
      return invalid();
    }

    const attempts = resetData.attempts || 0;
    if (new Date(resetData.expires_at) < new Date() || attempts >= MAX_RESET_ATTEMPTS) {
      await supabase.from('password_resets').update({ used: true }).eq('id', resetData.id);
      return invalid();
    }

    if (!hashesMatch(hashResetCode(token.trim().toLowerCase()), resetData.token_hash)) {
      const newAttempts = attempts + 1;
      await supabase
        .from('password_resets')
        .update({ attempts: newAttempts, used: newAttempts >= MAX_RESET_ATTEMPTS })
        .eq('id', resetData.id);

      await logAction(user.id, 'PASSWORD_RESET_FAILED', { email, attempts: newAttempts }, req.ip);
      return invalid();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await supabase
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetData.id);

    await logAction(user.id, 'PASSWORD_RESET_COMPLETE', { email }, req.ip);

    res.json({ message: 'Senha alterada com sucesso!' });

  } catch (err) {
    console.error('Erro no reset password:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { forgotPassword, resetPassword };
