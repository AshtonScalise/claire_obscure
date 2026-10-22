import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './lib/auth-context'
import { supabaseConfigured } from './lib/supabase'
import { splitChapter } from './lib/schema'
import { Layout } from './components/Layout'
import { BookReader } from './components/BookReader'
import { Library } from './pages/Library'
import { NovelView } from './pages/NovelView'
import { ReaderPage } from './pages/ReaderPage'
import { ChaptersPage } from './pages/ChaptersPage'
import { ChaptersView } from './components/ChaptersView'
import { NovelNew } from './pages/NovelNew'
import { NovelManage } from './pages/NovelManage'
import { PageEdit, PageEditor } from './pages/PageEdit'
import { Login } from './pages/Login'
import { Setup } from './pages/Setup'
import { EXAMPLE_PAGES } from './data/example'

/** Writing needs an account; reading never does. Owners-only editing is enforced per book. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="text-muted text-sm">Loading…</p>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

const signedIn = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>

/** The sample book as stored rows, for trying the editor before Supabase is set up. */
const SAMPLE_ROWS = EXAMPLE_PAGES.map((p, i) => ({
  ...splitChapter(p),
  id: `sample-${i}`,
  novel_id: 'preview',
  position: i + 1,
  created_at: '',
  updated_at: '',
}))

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
              backTo="/preview/chapters"
              storageKey="co:pos:preview"
            />
          }
        />
        <Route
          path="/preview/chapters"
          element={
            <ChaptersView
              title="The Lantern Keeper"
              author="A sample"
              pages={SAMPLE_ROWS}
              readPath="/preview"
              upTo="/"
              upLabel="Book"
              storageKey="co:pos:preview"
            />
          }
        />
        <Route
          path="/preview/write"
          element={
            <div className="mx-auto max-w-5xl px-4 py-8">
              <PageEditor
                novelId="preview"
                novelTitle="The Lantern Keeper"
                pages={SAMPLE_ROWS}
                initialChapter="Chapter 2: Grey Wax"
                startNewChapter={false}
              />
            </div>
          }
        />
        <Route path="*" element={<Setup />} />
      </Routes>
    )

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/n/:id/chapters" element={<ChaptersPage />} />
      <Route path="/n/:id/read" element={<ReaderPage />} />
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="n/:id" element={<NovelView />} />
        <Route path="new" element={signedIn(<NovelNew />)} />
        <Route path="n/:id/manage" element={signedIn(<NovelManage />)} />
        <Route path="n/:id/pages/new" element={signedIn(<PageEdit />)} />
        <Route path="n/:id/pages/:pageId" element={signedIn(<PageEdit />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
