import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import './index.css'

function App() {
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [marks, setMarks] = useState('')
  const [image, setImage] = useState(null)

  const fetchStudents = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', session.user.id)
    
    if (error) console.error('Error fetching students:', error)
    else setStudents(data)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({
        scope: 'local'
      })
      
      // Clear local state
      setSession(null)
      setStudents([])
      setName('')
      setMarks('')
      setImage(null)
      
    } catch (error) {
      console.error('Error logging out:', error.message)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchStudents()
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchStudents()
      } else {
        // Clear data when logged out
        setStudents([])
        setName('')
        setMarks('')
        setImage(null)
      }
    })

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe()
  }, [])

  const addStudent = async () => {
    try {
      let imageUrl = null
      
      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${session.user.id}/${Math.random()}.${fileExt}`
        
        const { data: imageData, error: imageError } = await supabase.storage
          .from('student-image')
          .upload(fileName, image)
          
        if (imageError) throw imageError
        
        const { data: { publicUrl } } = supabase.storage
          .from('student-image')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      const { data, error } = await supabase
        .from('students')
        .insert([{ 
          name, 
          marks,
          image_url: imageUrl,
          user_id: session.user.id
        }])
        .select()

      if (error) throw error

      setStudents([...students, data[0]])
      setName('')
      setMarks('')
      setImage(null)
    } catch (error) {
      console.error('Error adding student:', error.message)
    }
  }

  const deleteStudent = async (id) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
    
    if (error) console.error('Error deleting student:', error)
    else setStudents(students.filter((student) => student.id !== id))
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Students List</h1>
          {session?.user && ( // Only show logout button if user is authenticated
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Marks"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={addStudent} 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add Student
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  {student.image_url && (
                    <img 
                      src={student.image_url} 
                      alt={student.name} 
                      className="w-16 h-16 object-cover rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{student.name}</h3>
                    <p className="text-gray-500">Marks: {student.marks}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteStudent(student.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
