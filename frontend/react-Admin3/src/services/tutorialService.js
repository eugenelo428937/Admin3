import axios from 'axios';

const tutorialService = {
  getEvents: async () => {
    const res = await axios.get('/api/tutorials/events/');
    return res.data;
  },
};

export default tutorialService;
