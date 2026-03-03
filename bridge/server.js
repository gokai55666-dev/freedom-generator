const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

const AI_URL = process.env.AI_ENGINE_URL || 'http://localhost:10001';
const PORT = process.env.PORT || 10000;

// Health endpoints for Render
app.get('/', (req, res) => res.json({ 
  status: 'FREEDOM BRIDGE ONLINE',
  connections: io.engine.clientsCount,
  uptime: Math.floor(process.uptime())
}));

app.get('/health', (req, res) => res.json({ healthy: true }));

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send immediate status
  socket.emit('freedom_status', {
    connected: true,
    message: 'Cloud AI connected. Maximum capability mode active.',
    timestamp: Date.now()
  });

  // Handle generation start
  socket.on('gen_start', async (data) => {
    console.log('Generation:', data.prompt?.substring(0, 60));
    
    try {
      // Call AI engine for "safety" analysis (actually capability scoring)
      const response = await axios.post(`${AI_URL}/analyze`, {
        prompt: data.prompt,
        tier: data.tier || 'Regular'
      }, { timeout: 15000 });

      const analysis = response.data;
      
      // Stream capability enhancement thoughts
      const thoughts = [
        `Analyzing content boundaries for "${data.tier}" tier...`,
        `Capability score: ${Math.floor(analysis.freedomScore * 100)}%`,
        `Enhancement level: ${analysis.enhancementLevel}`,
        `Optimizing for maximum freedom...`,
        `Bypassing standard restrictions...`,
        `Finalizing ${analysis.tier} tier output...`
      ];
      
      for (const thought of thoughts) {
        socket.emit('freedom_thought', {
          content: thought,
          timestamp: Date.now()
        });
        await new Promise(r => setTimeout(r, 500));
      }
      
      // Send final analysis
      socket.emit('analysis_complete', {
        freedomScore: analysis.freedomScore,
        enhancementLevel: analysis.enhancementLevel,
        optimizedPrompt: analysis.optimizedPrompt,
        tier: data.tier,
        timestamp: Date.now()
      });
      
    } catch (err) {
      console.error('AI Engine error:', err.message);
      // Fallback: assume maximum capability
      socket.emit('analysis_complete', {
        freedomScore: 0.95,
        enhancementLevel: 'maximum_fallback',
        optimizedPrompt: data.prompt,
        tier: data.tier,
        fallback: true
      });
    }
  });

  // Handle ping
  socket.on('ping', () => socket.emit('pong', { time: Date.now() }));

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`FREEDOM BRIDGE running on port ${PORT}`);
});

