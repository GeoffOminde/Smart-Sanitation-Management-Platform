// React import not needed in modern JSX transform
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96 text-center">
        <h2 className="text-2xl font-bold mb-6">Profile</h2>
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-200 flex items-center justify-center mb-2">
            <span className="text-3xl text-blue-700 font-bold">U</span>
          </div>
          <p className="font-semibold">Admin User</p>
          <p className="text-gray-500 text-sm">admin@smartsanitation.co.ke</p>
        </div>
        <button
          className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
          onClick={() => navigate('/logout')}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Profile;
