// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StudentForm from "./StudentForm";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StudentForm />} />
      </Routes>
    </Router>
  );
};

export default App;
