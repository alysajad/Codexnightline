import { useState, useEffect } from 'react';
import api from '../api/axios';
import MeetingCard from '../components/MeetingCard';
import { Users, Calendar, TrendingUp, Plus } from 'lucide-react';

const AdminDashboard = () => {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({ upcoming: 0, total: 0, teachers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetingsRes, teachersRes] = await Promise.all([
          api.get('/meetings'),
          api.get('/auth/teachers')
        ]);
        
        const allMeetings = meetingsRes.data;
        const upcoming = allMeetings.filter(m => new Date(m.date) >= new Date());
        
        setMeetings(allMeetings);
        setStats({
          upcoming: upcoming.length,
          total: allMeetings.length,
          teachers: teachersRes.data.length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your school faculty meetings</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <Plus size={20} />
          <span>New Meeting</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Upcoming Meetings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Teachers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.teachers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Meetings Held</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total - stats.upcoming}</p>
          </div>
        </div>
      </div>

      {/* Recent Meetings list */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent & Upcoming Meetings</h2>
        </div>
        {meetings.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border border-gray-100">
            <p className="text-gray-500">No meetings scheduled yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.slice(0, 6).map(meeting => (
               <MeetingCard 
                key={meeting._id} 
                meeting={meeting} 
                onClick={(id) => console.log('Navigate to meeting', id)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
