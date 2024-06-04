import React, { lazy } from 'react'
import { Route, Routes } from 'react-router'
import { Loading, PageLayout } from '@components'

const UploadFilePage = lazy(() => import('../../pages/UploadFilePage'))
const ResultPage = lazy(() => import('../../pages/ResultPage'))
const Page404 = lazy(() => import('../../pages/404Page'))

export const AppRouter = () => (
  <React.Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<PageLayout />}>
        <Route path='/' element={<UploadFilePage />} />
        <Route path='/results' element={<ResultPage />} />
        <Route path='*' element={<Page404 />} />
      </Route>
    </Routes>
  </React.Suspense>
)
