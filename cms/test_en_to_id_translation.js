import axios from 'axios';

async function testEnToId() {
  console.log('=== TESTING EN-TO-ID TRANSLATION OVER HTTP ===');
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Login successful.');

    // 2. Create a test project with EN-only content
    console.log('Creating EN-only project...');
    const projectPayload = {
      title: { en: 'English Title Test', id: '' },
      description: { en: 'English Description Test', id: '' },
      content: { en: 'English Content Test with some long markdown and LaTeX $$x^2$$ to make it real.', id: '' },
      status: 'draft',
      contentLanguage: 'bilingual'
    };
    const createRes = await axios.post('http://localhost:5001/api/projects', projectPayload, authHeader);
    const createdProject = createRes.data;
    console.log('Created project:', JSON.stringify(createdProject, null, 2));

    // 3. Test POST /api/translate (Google)
    console.log('\n--- Testing POST /api/translate ---');
    try {
      const translateRes = await axios.post(
        'http://localhost:5001/api/translate',
        {
          postId: createdProject._id,
          contentType: 'project',
          currentLanguage: 'id'
        },
        authHeader
      );
      console.log('Google Translate response:', JSON.stringify(translateRes.data, null, 2));
    } catch (err) {
      console.error('Google Translate error:', err.response?.data || err.message);
    }

    // 4. Test POST /api/translate-hybrid
    console.log('\n--- Testing POST /api/translate-hybrid ---');
    try {
      const hybridRes = await axios.post(
        'http://localhost:5001/api/translate-hybrid',
        {
          postId: createdProject._id,
          contentType: 'project',
          currentLanguage: 'id'
        },
        authHeader
      );
      console.log('Hybrid Translate response:', JSON.stringify(hybridRes.data, null, 2));
    } catch (err) {
      console.error('Hybrid Translate error:', err.response?.data || err.message);
    }

    // 5. Test POST /api/translate-smartai
    console.log('\n--- Testing POST /api/translate-smartai ---');
    try {
      const smartAiRes = await axios.post(
        'http://localhost:5001/api/translate-smartai',
        {
          postId: createdProject._id,
          contentType: 'project',
          currentLanguage: 'id'
        },
        authHeader
      );
      console.log('Smart AI response:', JSON.stringify(smartAiRes.data, null, 2));
    } catch (err) {
      console.error('Smart AI error:', err.response?.data || err.message);
    }

    // Cleanup
    console.log('\nCleaning up test project...');
    await axios.delete(`http://localhost:5001/api/projects/${createdProject._id}`, authHeader);
    console.log('Cleanup complete.');

  } catch (err) {
    console.error('Error in test script:', err.message);
  }
}

testEnToId();
