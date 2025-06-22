import { useState, useEffect } from 'react';

/**
 * Password strength meter component
 * @param {Object} props - Component props
 * @param {string} props.password - The password to evaluate
 * @param {function} props.onStrengthChange - Callback when strength changes
 * @returns {JSX.Element} Password strength meter component
 */
const PasswordStrengthMeter = ({ password, onStrengthChange }) => {
  const [strength, setStrength] = useState({
    score: 0,
    label: 'Weak',
    color: 'bg-red-500',
    width: '25%',
    feedback: []
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        label: 'Weak',
        color: 'bg-red-500',
        width: '0%',
        feedback: ['Please enter a password']
      });
      if (onStrengthChange) onStrengthChange(0);
      return;
    }

    // Evaluate password strength
    const feedback = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push('Password should be at least 8 characters');
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add uppercase letters');
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      feedback.push('Add lowercase letters');
    } else {
      score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      feedback.push('Add numbers');
    } else {
      score += 1;
    }

    // Special character check
    if (!/[^A-Za-z0-9]/.test(password)) {
      feedback.push('Add special characters');
    } else {
      score += 1;
    }

    // Determine strength label, color and width
    let label, color, width;
    
    switch (score) {
      case 0:
      case 1:
        label = 'Very Weak';
        color = 'bg-red-500';
        width = '20%';
        break;
      case 2:
        label = 'Weak';
        color = 'bg-orange-500';
        width = '40%';
        break;
      case 3:
        label = 'Medium';
        color = 'bg-yellow-500';
        width = '60%';
        break;
      case 4:
        label = 'Strong';
        color = 'bg-blue-500';
        width = '80%';
        break;
      case 5:
        label = 'Very Strong';
        color = 'bg-green-500';
        width = '100%';
        break;
      default:
        label = 'Weak';
        color = 'bg-red-500';
        width = '20%';
    }

    setStrength({ score, label, color, width, feedback });
    
    // Notify parent component of strength change
    if (onStrengthChange) {
      onStrengthChange(score);
    }
  }, [password, onStrengthChange]);

  return (
    <div className="mt-1 mb-3">
      <div className="flex justify-between items-center mb-1">
        <div className="h-2 w-full bg-gray-200 rounded-full">
          <div
            className={`h-2 ${strength.color} rounded-full transition-all duration-300 ease-in-out`}
            style={{ width: strength.width }}
          ></div>
        </div>
        <span className="ml-2 text-xs text-gray-600">{strength.label}</span>
      </div>
      
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-gray-600 mt-1 space-y-1">
          {strength.feedback.map((item, index) => (
            <li key={index} className="flex items-center">
              <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthMeter; 