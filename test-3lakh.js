import handler from './api/_handlers/competition-map.js';

handler({
  method: 'GET',
  query: {
    course: 'MBBS',
    category: 'General',
    quota: 'All',
    college_type: 'All',
    year: '2024',
    round: 'All',
    rank: '300000'
  }
}, {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => {
      console.log(data.states.map(s => `${s.state_name}: ${s.difficulty} (${s.admission_probability})`).join('\n'));
    }
  })
});
