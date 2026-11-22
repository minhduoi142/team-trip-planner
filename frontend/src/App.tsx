import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { ProtectedRoute, PublicOnlyRoute } from '@/auth/routes'
import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { JoinPage } from '@/pages/JoinPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TripDetailPage } from '@/pages/TripDetailPage'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/trips" replace /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  // Xem trước lời mời không cần đăng nhập
  { path: '/join/:code', element: <JoinPage /> },
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
