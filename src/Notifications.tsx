// React import not needed in modern JSX transform

const Notifications = () => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Notifications</h2>
        <ul className="space-y-4">
          <li className="p-4 bg-blue-50 rounded">New booking received for Unit ST-002.</li>
          <li className="p-4 bg-yellow-50 rounded">Low battery alert for Unit ST-003.</li>
          <li className="p-4 bg-red-50 rounded">Unit ST-003 requires immediate servicing.</li>
        </ul>
      </div>
    </div>
  );
};

export default Notifications;
