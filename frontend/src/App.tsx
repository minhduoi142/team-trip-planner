import { createBrowserRouter, RouterProvider } from 'react-router'
import { ProtectedRoute, PublicOnlyRoute } from '@/auth/routes'
import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { JoinPage } from '@/pages/JoinPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ShareRedirectPage } from '@/pages/ShareRedirectPage'
import { TripDetailPage } from '@/pages/TripDetailPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  // Xem trước lời mời không cần đăng nhập
  { path: '/join/:code', element: <JoinPage /> },
  // Phòng khi proxy chưa chuyển /share/ sang backend (xem ShareRedirectPage)
  { path: '/share/:code/*', element: <ShareRedirectPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/trips', element: <DashboardPage /> },
          { path: '/trips/:tripId', element: <TripDetailPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
