// ==UserScript==
// @name         Freedom Generator Connector
// @namespace    freedom-generator
// @version      1.0
// @description  Connects Perchance Freedom Generator to cloud bridge
// @match        *://perchance.org/*
// @match        *://*.perchance.org/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('🔓 Freedom Generator: Looking for bridge config...');
    
    let socket = null;
    let connected = false;
    let reconnectInterval = null;
    
    // Find Freedom Generator instances
    function findGenerator() {
        // Check for bridgeConfig in page
        if (window.bridgeConfig && window.bridgeConfig.version === "1.0") {
            return window.bridgeConfig;
        }
        
        // Check for Freedom Generator UI elements
        const freedomInputs = document.querySelectorAll('input[placeholder*="freedom"], textarea[placeholder*="Freedom"]');
        if (freedomInputs.length > 0) {
            return { url: "wss://freedom-bridge.onrender.com", autoConnect: true };
        }
        
        return null;
    }
    
    // Inject floating status panel
    function injectPanel() {
        if (document.getElementById('freedom-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'freedom-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 260px;
            background: rgba(0,0,0,0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 11px;
            padding: 10px;
            border: 1px solid #0f0;
            border-radius: 4px;
            z-index: 99999;
        `;
        
        panel.innerHTML = `
            <div style="font-weight:bold; border-bottom:1px solid #0f0; margin-bottom:5px;">
                🔓 FREEDOM GENERATOR
            </div>
            <div id="f-status" style="color:#f44;">DISCONNECTED</div>
            <div id="f-thought" style="margin-top:5px; font-size:10px; color:#888; height:40px; overflow:hidden;"></div>
            <button id="f-toggle" style="margin-top:5px; width:100%; background:#222; color:#0f0; border:1px solid #0f0; padding:3px; cursor:pointer;">
                CONNECT
            </button>
        `;
        
        document.body.appendChild(panel);
        
        document.getElementById('f-toggle').onclick = () => {
            if (connected) disconnect();
            else connect();
        };
    }
    
    // Update UI
    function updateStatus(msg, type='info') {
        const status = document.getElementById('f-status');
        const thought = document.getElementById('f-thought');
        
        if (status) {
            status.textContent = msg;
            status.style.color = type === 'error' ? '#f44' : type === 'success' ? '#0f0' : '#ff0';
        }
        
        if (thought && msg.includes('...')) {
            thought.textContent = '> ' + msg;
        }
    }
    
    // Connect to WebSocket
    function connect() {
        const config = findGenerator();
        if (!config) {
            updateStatus('No generator found', 'error');
            return;
        }
        
        const url = config.url;
        updateStatus('Connecting...', 'info');
        
        try {
            socket = new WebSocket(url);
            
            socket.onopen = () => {
                connected = true;
                updateStatus('🟢 CLOUD CONNECTED', 'success');
                console.log('Freedom Generator: Connected to', url);
                
                // Update Perchance variables via DOM
                updatePerchanceVariable('freedomConnected', true);
                updatePerchanceVariable('freedomUrl', url);
                
                // Clear reconnect interval
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            };
            
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };
            
            socket.onerror = (err) => {
                console.error('WebSocket error:', err);
                updateStatus('Connection error', 'error');
            };
            
            socket.onclose = () => {
                connected = false;
                updateStatus('🔴 DISCONNECTED', 'error');
                updatePerchanceVariable('freedomConnected', false);
                
                // Auto-reconnect after 5s
                if (!reconnectInterval) {
                    reconnectInterval = setTimeout(connect, 5000);
                }
            };
            
        } catch (e) {
            updateStatus('Failed: ' + e.message, 'error');
        }
    }
    
    // Handle incoming messages
    function handleMessage(data) {
        switch(data.type) {
            case 'freedom_status':
                updateStatus('🟢 ' + data.message, 'success');
                break;
                
            case 'freedom_thought':
                updateStatus(data.content, 'info');
                updatePerchanceVariable('lastFreedomThought', data.content);
                break;
                
            case 'analysis_complete':
                updateStatus('Analysis: ' + data.enhancementLevel, 'success');
                updatePerchanceVariable('freedomScore', data.freedomScore);
                updatePerchanceVariable('cloudOptimizedPrompt', data.optimizedPrompt);
                
                // Try to fill the cloudOptimizedPrompt input
                const optInput = findInputByPlaceholder('cloud-optimized');
                if (optInput) optInput.value = data.optimizedPrompt;
                break;
        }
    }
    
    // Update Perchance internal variable
    function updatePerchanceVariable(name, value) {
        // Try to find and update the variable in Perchance's scope
        if (window.input && typeof window.input === 'object') {
            window.input[name] = value;
        }
        
        // Also try to update any visible displays
        const displays = document.querySelectorAll('input[disabled], textarea[disabled]');
        displays.forEach(el => {
            const label = el.closest('.userInput')?.querySelector('label');
            if (label && label.textContent.toLowerCase().includes(name.toLowerCase())) {
                el.placeholder = value.toString();
            }
        });
    }
    
    // Find input by placeholder text
    function findInputByPlaceholder(text) {
        const inputs = document.querySelectorAll('input, textarea');
        for (let inp of inputs) {
            if (inp.placeholder && inp.placeholder.toLowerCase().includes(text.toLowerCase())) {
                return inp;
            }
        }
        return null;
    }
    
    // Hook generation calls
    function hookGeneration() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            const url = args[0];
            const options = args[1] || {};
            
            // Detect Perchance generation
            if (typeof url === 'string' && url.includes('/generate')) {
                let prompt = 'unknown';
                let tier = 'Regular';
                
                try {
                    if (options.body) {
                        const body = JSON.parse(options.body);
                        prompt = body.prompt || 'unknown';
                    }
                    
                    // Find current NSFW tier from inputs
                    const tierSelect = document.querySelector('select');
                    if (tierSelect) tier = tierSelect.value || 'Regular';
                    
                } catch(e) {}
                
                if (connected && socket.readyState === WebSocket.OPEN) {
                    socket.emit('gen_start', { prompt, tier });
                }
            }
            
            return originalFetch.apply(this, args);
        };
    }
    
    // Disconnect
    function disconnect() {
        if (socket) {
            socket.close();
            socket = null;
        }
        connected = false;
        updateStatus('DISCONNECTED', 'error');
    }
    
    // Initialize
    function init() {
        injectPanel();
        hookGeneration();
        
        // Auto-connect if generator found
        if (findGenerator()) {
            setTimeout(connect, 1000);
        }
    }
    
    // Run when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
