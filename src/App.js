import logo from './logo.svg';
import './App.css';


function App() {
  return (
      <div className="min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            React + Tailwind CSS
          </h1>
          <p className="text-gray-600 mb-6">
            🎉 Установка прошла успешно! 🎉
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors">
              Начать
            </button>
            <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">
              Назад
            </button>
          </div>
        </div>
      </div>
  );
}

export default App;
