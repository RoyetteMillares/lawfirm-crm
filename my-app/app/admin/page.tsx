import { auth } from "@/lib/auth"

export default async function AdminDashboard() {
  const session = await auth()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Platform Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-lg">Welcome, {session?.user.name}!</p>
        <p className="text-gray-600 mt-2">Role: {session?.user.role}</p>
      </div>
    </div>
  )
}
