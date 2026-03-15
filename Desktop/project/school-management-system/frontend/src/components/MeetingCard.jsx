import { format } from 'date-fns';
import { Clock, MapPin, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MeetingCard = ({ meeting }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/meetings/${meeting._id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">{meeting.title}</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
          {format(new Date(meeting.date), 'MMM d, yyyy')}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-1">
        {meeting.agenda}
      </p>

      <div className="space-y-2 mt-auto pt-4 border-t border-gray-50">
        <div className="flex items-center text-sm text-gray-500">
          <Clock size={16} className="mr-2 text-gray-400" />
          {meeting.time}
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Users size={16} className="mr-2 text-gray-400" />
          {meeting.attendees?.length || 0} Expected Attendees
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
