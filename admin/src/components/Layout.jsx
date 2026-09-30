import Sidebar from './Sidebar'

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

export default Layout