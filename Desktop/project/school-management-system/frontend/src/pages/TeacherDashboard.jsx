import { useState, useEffect } from 'react';
import api from '../api/axios';
import MeetingCard from '../components/MeetingCard';
import { Calendar, LayoutList, Bell } from 'lucide-react';
import { format } from 'date-fns';

const TeacherDashboard = () => {
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetingsRes, tasksRes, notifRes] = await Promise.all([
          api.get('/meetings'),
          api.get('/tasks'),
          api.get('/notifications')
        ]);
        
        setMeetings(meetingsRes.data);
        setTasks(tasksRes.data);
        setNotifications(notifRes.data);
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTaskComplete = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}/complete`, { isCompleted: true });
      setTasks(tasks.filter(t => t._id !== taskId));
    } catch (error) {
      console.error('Failed to complete task', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here is your overview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Meetings & Notifications */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Upcoming Meetings
            </h2>
            {upcomingMeetings.length === 0 ? (
               <p className="text-gray-500 text-sm">No upcoming meetings.</p>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {upcomingMeetings.map(meeting => (
                    <MeetingCard 
                      key={meeting._id} 
                      meeting={meeting} 
                      onClick={(id) => console.log('Navigate to meeting', id)} 
                    />
                 ))}
               </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-indigo-600" />
              Recent Notifications
            </h2>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm">No new notifications.</p>
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 5).map(notif => (
                  <li key={notif._id} className="text-sm p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                    <span className="w-2 h-2 mt-1.5 bg-indigo-500 rounded-full shrink-0"></span>
                    <span className="text-gray-700">{notif.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Tasks */}
        <div className="col-span-1">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LayoutList size={20} className="text-indigo-600" />
              My Pending Tasks
            </h2>
            {tasks.filter(t => !t.isCompleted).length === 0 ? (
               <p className="text-gray-500 text-sm text-center py-8">All caught up! No pending tasks.</p>
            ) : (
               <ul className="space-y-4">
                 {tasks.filter(t => !t.isCompleted).map(task => (
                    <li key={task._id} className="p-4 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition">
                      <p className="text-sm font-medium text-gray-800">{task.description}</p>
                      {task.dueDate && (
                         <p className="text-xs text-gray-500 mt-2">Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</p>
                      )}
                      <button 
                        onClick={() => handleTaskComplete(task._id)}
                        className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition"
                      >
                        Mark as completed
                      </button>
                    </li>
                 ))}
               </ul>
            )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
