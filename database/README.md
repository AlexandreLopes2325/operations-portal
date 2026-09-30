# Database / Banco de dados

| File | Purpose |
|---|---|
| `schema.sql` | Table structure only (PKs, FKs, indexes, constraints). No data. |
| `seed.sql` | 100% fictional demo data. All demo users share the password `Demo@1234`. |
| `migrations/` | Incremental changes for databases created with an older `schema.sql`. |

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

On Supabase you can also paste both files into the **SQL Editor**. The backend uses three public
**Storage buckets** that must be created manually: `logos`, `images` and `tools`.

## Entity-relationship diagram

```mermaid
erDiagram
    users ||--o{ password_resets : "requests"
    users ||--o{ audit_logs : "performs"
    users ||--o{ manuals : "creates"
    users ||--o{ logos : "uploads"
    users ||--o{ tools : "creates"
    users ||--o{ returns : "registers"
    manuals ||--o{ sections : "has blocks"
    return_channels ||--o{ return_reasons : "defines"
    return_channels ||--o{ returns : "channel of"

    users {
        uuid id PK
        text name
        text email UK
        text password "bcrypt hash"
        text role "viewer|editor|admin|admin_master"
        jsonb permissions "null = role defaults"
        timestamptz created_at
        timestamptz updated_at
    }
    password_resets {
        uuid id PK
        uuid user_id FK
        text token_hash "sha256 of the code"
        int attempts "max 5"
        timestamptz expires_at
        boolean used
        timestamptz created_at
    }
    audit_logs {
        uuid id PK
        uuid user_id FK
        text action
        jsonb details
        text ip_address
        timestamptz created_at
    }
    manuals {
        uuid id PK
        text title
        text description
        text slug UK
        text status "draft|published"
        boolean is_template
        text custom_html
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    sections {
        uuid id PK
        uuid manual_id FK
        text type "title|subtitle|text|alert|table|image|step|checklist|divider"
        jsonb content
        text color
        int sort_order
    }
    logos {
        uuid id PK
        text brand_name
        text svg_url
        text png_url
        uuid uploaded_by FK
    }
    tools {
        uuid id PK
        text title
        text icon
        text slug UK
        text html_url
        boolean is_active
        uuid created_by FK
    }
    size_charts {
        uuid id PK
        text title
        text brand
        text category
        jsonb data
    }
    return_channels {
        uuid id PK
        text key UK
        text label
        int sort_order
        boolean is_active
        boolean requires_return_id
    }
    return_reasons {
        uuid id PK
        text channel FK
        text label
        int sort_order
        boolean is_active
    }
    returns {
        uuid id PK
        text order_number
        text channel FK
        text product
        text reason
        text status "aguardando_retorno|quarentena|aguardando_canal|finalizado"
        boolean has_complaint
        date quarantine_start
        int quarantine_days
        numeric product_value
        boolean has_penalty
        numeric penalty_value
        text resolution_notes
        uuid created_by FK
    }
```

`size_charts` is standalone (used by the embedded size-chart tool). `returns.reason` stores the
reason **label** as text, so historical records survive if a reason is renamed or deleted.

> The schema was reverse-engineered from the queries in `src/controllers/`. /
> O schema foi deduzido das queries em `src/controllers/`.
