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

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error;
      }
      
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
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
      if (session?.user) {
        fetchStudents() // Fetch when session is available
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await fetchStudents() // Fetch when auth state changes
      } else {
        setStudents([])
        setName('')
        setMarks('')
        setImage(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // Remove fetchStudents from dependency array

  // Add a separate useEffect to watch for session changes
  useEffect(() => {
    if (session?.user) {
      fetchStudents()
    }
  }, [session]) // This will run whenever session changes

  const addStudent = async () => {
    try {
      // Validate marks input
      const numericMarks = Number(marks)
      if (isNaN(numericMarks)) {
        throw new Error('Marks must be a valid number')
      }

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

      const { error } = await supabase
        .from('students')
        .insert([{ 
          name, 
          marks: numericMarks,
          image_url: imageUrl,
          user_id: session.user.id
        }])

      if (error) throw error

      // Fetch fresh data instead of manually updating state
      await fetchStudents()
      
      // Clear form
      setName('')
      setMarks('')
      setImage(null)
    } catch (error) {
      alert(error.message)
      console.error('Error adding student:', error.message)
    }
  }

  const deleteStudent = async (id) => {
    try {
      // First get the student to find the image URL
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('image_url')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()
      
      if (fetchError) throw fetchError

      // If there's an image, delete it from storage
      if (student?.image_url) {
        const imagePath = student.image_url.split('/').slice(-2).join('/') // Get path like: 'user_id/filename.ext'
        const { error: storageError } = await supabase.storage
          .from('student-image')
          .remove([imagePath])
        
        if (storageError) throw storageError
      }

      // Then delete the student record
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)
      
      if (deleteError) throw deleteError

      // Update the local state
      setStudents(students.filter((student) => student.id !== id))
      
    } catch (error) {
      console.error('Error deleting student:', error.message)
      alert('Error deleting student: ' + error.message)
    }
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
