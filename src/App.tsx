import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './lib/auth-context'
import { supabase, supabaseConfigured } from './lib/supabase'
import { splitChapter } from './lib/schema'
import { Layout } from './components/Layout'
import { BookReader } from './components/BookReader'
import { Library } from './pages/Library'
import { NovelView } from './pages/NovelView'
import { ReaderPage } from './pages/ReaderPage'
import { NovelNew } from './pages/NovelNew'
import { NovelManage } from './pages/NovelManage'
import { PageEdit } from './pages/PageEdit'
import { Login } from './pages/Login'
import { Setup } from './pages/Setup'
import { EXAMPLE_PAGES } from './data/example'

/** Writing and managing requires a signed-in admin; reading never does. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading) return <p className="text-muted text-sm">Loading…</p>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!isAdmin)
    return (
      <div className="space-y-3">
        <p>This account doesn't have admin access.</p>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    )
  return children
}

const admin = (el: ReactNode) => <AdminOnly>{el}</AdminOnly>

export default function App() {
  if (!supabaseConfigured)
    return (
      <Routes>
        <Route
          path="/preview"
          element={
            <BookReader
              title="The Lantern Keeper"
              author="A sample"
              pages={EXAMPLE_PAGES.map(splitChapter)}
              backTo="/"
              storageKey="co:pos:preview"
            />
          }
        />
        <Route path="*" element={<Setup />} />
      </Routes>
    )

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/n/:id/read" element={<ReaderPage />} />
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="n/:id" element={<NovelView />} />
        <Route path="new" element={admin(<NovelNew />)} />
        <Route path="n/:id/manage" element={admin(<NovelManage />)} />
        <Route path="n/:id/pages/new" element={admin(<PageEdit />)} />
        <Route path="n/:id/pages/:pageId" element={admin(<PageEdit />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
