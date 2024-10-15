import React, { useState } from 'react';

const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const StudentForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    student_ref: '',
    student_type: '',
    apprentice_type: '',
    remarks: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const csrftoken = getCookie('csrftoken');
    console.log("CSRF Token:", csrftoken);  
    
    try {
      const response = await fetch('http://localhost:8888/students/add_student/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error:', errorData);
        // Handle the error accordingly
      } else {
        const data = await response.json();
        console.log('Success:', data);
        // Handle the success accordingly
      }
    } catch (error) {
      console.error('Error:', error);
      // Handle the error accordingly
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Username:</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Student Reference:</label>
        <input
          type="text"
          name="student_ref"
          value={formData.student_ref}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Student Type:</label>
        <input
          type="text"
          name="student_type"
          value={formData.student_type}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Apprentice Type:</label>
        <input
          type="text"
          name="apprentice_type"
          value={formData.apprentice_type}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Remarks:</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
        />
      </div>
      <button type="submit">Create Student</button>
    </form>
  );
};

export default StudentForm;
