// src/hooks/useResourceData.js
import { useState, useEffect } from 'react';

export function useResourceData(fetchFunction, initialState = []) {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fetchFunction();
      setData(result);
      setError(null);
    } catch (err) {
      setError(`Failed to loa
