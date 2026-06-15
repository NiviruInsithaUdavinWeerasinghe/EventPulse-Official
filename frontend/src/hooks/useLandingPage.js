import { useState, useCallback } from 'react';

/**
 * Custom hook to manage the business logic and state for the EventPulse Landing Page.
 * Decouples the presentation (UI) from state management and API interactions.
 */
export default function useLandingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoRequest, setDemoRequest] = useState({
    name: '',
    email: '',
    company: '',
    eventType: 'Exhibition',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const openDemoModal = useCallback(() => {
    setIsDemoModalOpen(true);
    setSubmitSuccess(false);
  }, []);

  const closeDemoModal = useCallback(() => {
    setIsDemoModalOpen(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setDemoRequest((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const submitDemoRequest = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call to the backend
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log('Demo requested successfully:', demoRequest);
      setSubmitSuccess(true);
      setDemoRequest({
        name: '',
        email: '',
        company: '',
        eventType: 'Exhibition',
      });
    } catch (error) {
      console.error('Failed to submit demo request:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [demoRequest]);

  return {
    isDemoModalOpen,
    demoRequest,
    isSubmitting,
    submitSuccess,
    openDemoModal,
    closeDemoModal,
    handleInputChange,
    submitDemoRequest,
  };
}
