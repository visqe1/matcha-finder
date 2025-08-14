import { useState } from 'react';
import { login } from '../lib/api';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');

  const handleLogin = async () => {
    if (!username.trim()) return;
    const data = await login(username.trim());
    if (data.user) {
      onLogin(data.user);
      setUsername('');
    }
  };

  return (
    <div className="login-section">
      <input
        type="text"
        className="input"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      />
      <button className="btn btn-primary" onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}

