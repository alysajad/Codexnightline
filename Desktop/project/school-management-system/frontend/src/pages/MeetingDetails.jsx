import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Calendar as CalendarIcon, Users, CheckCircle, FileText, LayoutList } from 'lucide-react';

const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [meeting, setMeeting] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for new task
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        const [meetRes, attRes, tasksRes] = await Promise.all([
          api.get(`/meetings/${id}`),
          user.role === 'Admin' ? api.get(`/attendance/${id}`) : Promise.resolve({ data: [] }),
          api.get(`/tasks/meeting/${id}`)
        ]);
        setMeeting(meetRes.data);
        if (user.role === 'Admin') setAttendance(attRes.data);
        setTasks(tasksRes.data);
      } catch (error) {
        console.error('Error fetching meeting details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetingData();
  }, [id, user.role]);

  const handleMarkAttendance = async (status) => {
    try {
      await api.post('/attendance', { meetingId: id, status });
      alert(`Attendance marked as ${status}`);
    } catch (error) {
      console.error(error);
      alert('Failed to mark attendance');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskDesc || !assigneeId) return;
    try {
      const res = await api.post('/tasks', {
        description: newTaskDesc,
        assignedTo: assigneeId,
        meetingRef: id
      });
      setTasks([...tasks, res.data]);
      setNewTaskDesc('');
      setAssigneeId('');
    } catch (error) {
      console.error(error);
      alert('Failed to assign task');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!meeting) return <div className="p-8">Meeting not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 text-white relative">
          <h1 className="text-3xl font-bold pr-20">{meeting.title}</h1>
          <p className="mt-2 text-indigo-100 opacity-90">{meeting.agenda}</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50">
           <div className="flex items-center text-gray-700">
             <CalendarIcon className="w-5 h-5 mr-3 text-indigo-500" />
             <span className="font-medium">{format(new Date(meeting.date), 'MMMM d, yyyy')}</span>
           </div>
           <div className="flex items-center text-gray-700">
             <Clock className="w-5 h-5 mr-3 text-indigo-500" />
             <span className="font-medium">{meeting.time}</span>
           </div>
           <div className="flex items-center text-gray-700">
             <Users className="w-5 h-5 mr-3 text-indigo-500" />
             <span className="font-medium">{meeting.attendees?.length} Expected Attendees</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content: Notes and Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <div className="bg-white border text-gray-800 border-gray-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center mb-4 border-b border-gray-100 pb-2">
              <FileText className="w-5 h-5 mr-2 text-indigo-500" />
              Meeting Notes & Description
            </h2>
            <div className="prose prose-sm md:prose-base max-w-none text-gray-600 whitespace-pre-wrap">
              {meeting.description || meeting.notes || "No notes available for this meeting yet."}
            </div>
           </div>

           {/* Tasks */}
           <div className="bg-white border text-gray-800 border-gray-100 rounded-xl p-6 shadow-sm">
             <h2 className="text-lg font-bold flex items-center mb-4 border-b border-gray-100 pb-2">
              <LayoutList className="w-5 h-5 mr-2 text-indigo-500" />
              Assigned Tasks
             </h2>
             {tasks.length === 0 ? (
               <p className="text-sm text-gray-500 italic">No tasks have been assigned from this meeting.</p>
             ) : (
               <ul className="space-y-3">
                 {tasks.map(task => (
                   <li key={task._id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                     <div>
                       <p className="text-sm font-medium">{task.description}</p>
                       <p className="text-xs text-gray-500 mt-1">Assignee: {task.assignedTo?.name || 'Unknown'}</p>
                     </div>
                     <div>
                       {task.isCompleted ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>
                       ) : (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                       )}
                     </div>
                   </li>
                 ))}
               </ul>
             )}

             {/* Admin Add Task Form */}
             {user.role === 'Admin' && (
               <form onSubmit={handleCreateTask} className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                 <input 
                   type="text" 
                   value={newTaskDesc}
                   onChange={e => setNewTaskDesc(e.target.value)}
                   className="flex-1 text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border border-blue-100 outline-none"
                   placeholder="Task description..."
                   required
                 />
                 <select 
                   value={assigneeId}
                   onChange={e => setAssigneeId(e.target.value)}
                   className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border border-blue-100 outline-none"
                   required
                 >
                   <option value="">Select Assignee</option>
                   {meeting.attendees.map(att => (
                     <option key={att._id} value={att._id}>{att.name}</option>
                   ))}
                 </select>
                 <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                   Assign
                 </button>
               </form>
             )}
           </div>
        </div>

        {/* Sidebar: Attendance */}
        <div className="space-y-6">
          <div className="bg-white border text-gray-800 border-gray-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center mb-4 border-b border-gray-100 pb-2">
              <CheckCircle className="w-5 h-5 mr-2 text-indigo-500" />
              Attendance
            </h2>

            {user.role === 'Teacher' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-2">Mark your attendance for this meeting:</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleMarkAttendance('Present')}
                    className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                  >
                    Present
                  </button>
                  <button 
                    onClick={() => handleMarkAttendance('Absent')}
                    className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                  >
                    Absent
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {attendance.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No attendance marked yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {attendance.map(record => (
                      <li key={record._id} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-700">{record.user?.name}</span>
                        <span className={`font-semibold ${record.status === 'Present' ? 'text-green-600' : 'text-red-600'}`}>
                          {record.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetails;
