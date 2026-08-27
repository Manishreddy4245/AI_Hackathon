import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const ApplicationReturn: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/student/drives', { replace: true });
  }, [navigate]);

  return null;
};
