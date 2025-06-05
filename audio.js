/**
 * Audio generator for Mandelbrot Explorer
 * Creates ambient sounds based on the current view of the fractal
 */

class MandelbrotAudio {
  constructor() {
    // Initialize Web Audio API
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = false;
    this.oscillators = [];
    this.gains = [];
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.audioContext.destination);
    
    // For reverb effect
    this.convolver = this.audioContext.createConvolver();
    this.createReverb();
    
    // Create base oscillators
    this.createOscillators();
    
    // Analysis parameters
    this.lastUpdate = 0;
    this.updateInterval = 100; // ms between audio updates
  }
  
  /**
   * Create a reverb effect
   */
  async createReverb() {
    // Create impulse response for reverb
    const sampleRate = this.audioContext.sampleRate;
    const length = 2 * sampleRate; // 2 seconds
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Decay curve
        const decay = Math.exp(-i / (sampleRate * 1.5));
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    
    this.convolver.buffer = impulse;
    this.convolver.connect(this.masterGain);
  }
  
  /**
   * Create the base oscillators for ambient sound
   */
  createOscillators() {
    // Clear existing oscillators
    this.stopSound();
    this.oscillators = [];
    this.gains = [];
    
    // Create 5 oscillators with different base frequencies
    const baseFrequencies = [
      55,    // A1
      82.5,  // E2
      110,   // A2
      164.8, // E3
      220    // A4
    ];
    
    // Different waveforms for variety
    const waveforms = ['sine', 'triangle', 'sine', 'sine', 'triangle'];
    
    for (let i = 0; i < baseFrequencies.length; i++) {
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = waveforms[i];
      oscillator.frequency.value = baseFrequencies[i];
      
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;
      
      // Connect oscillator -> gain -> convolver (reverb) -> master
      oscillator.connect(gain);
      
      // Some go to reverb, some direct to master for clarity
      if (i % 2 === 0) {
        gain.connect(this.convolver);
      } else {
        gain.connect(this.masterGain);
      }
      
      this.oscillators.push(oscillator);
      this.gains.push(gain);
    }
  }
  
  /**
   * Start playing the ambient sound
   */
  startSound() {
    if (this.isPlaying) return;
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Start all oscillators
    const now = this.audioContext.currentTime;
    this.oscillators.forEach(osc => {
      osc.start(now);
    });
    
    this.isPlaying = true;
  }
  
  /**
   * Stop all sound
   */
  stopSound() {
    if (!this.isPlaying) return;
    
    // Stop all oscillators
    const now = this.audioContext.currentTime;
    this.oscillators.forEach(osc => {
      try {
        osc.stop(now);
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    
    this.isPlaying = false;
  }
  
  /**
   * Update the sound based on the current Mandelbrot view
   * @param {Object} params - Parameters from the Mandelbrot view
   */
  updateSound(params) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;
    
    const { center, scale, iterations, brightness, contrast } = params;
    
    // Calculate audio parameters based on Mandelbrot parameters
    const audioTime = this.audioContext.currentTime;
    
    // Scale affects overall pitch - lower scale (more zoom) = higher pitch
    const pitchFactor = Math.max(0.5, Math.min(2, 1 / (scale * 0.1)));
    
    // Center position affects panning and modulation
    const xFactor = (center.x + 0.5) * 2; // Normalize to 0-2 range
    const yFactor = (center.y + 0.5) * 2;
    
    // Iterations affect complexity/harmonics
    const iterFactor = iterations / 1000;
    
    // Update each oscillator
    this.oscillators.forEach((osc, i) => {
      // Base frequency modified by position and zoom
      const baseFreq = osc.frequency.value;
      const newFreq = baseFreq * pitchFactor * (1 + (i * 0.02 * xFactor));
      
      // Smooth transition to new frequency
      osc.frequency.exponentialRampToValueAtTime(
        newFreq, 
        audioTime + 1
      );
      
      // Volume based on position and brightness
      const volume = 0.1 + (0.2 * brightness * (1 - (i * 0.15)));
      
      // Smooth transition to new volume
      this.gains[i].gain.linearRampToValueAtTime(
        volume, 
        audioTime + 0.5
      );
    });
    
    // Master volume affected by contrast
    this.masterGain.gain.linearRampToValueAtTime(
      0.2 + (contrast * 0.2),
      audioTime + 0.5
    );
  }
  
  /**
   * Analyze the canvas to extract additional audio parameters
   * @param {HTMLCanvasElement} canvas - The WebGL canvas
   */
  analyzeCanvas(canvas) {
    // This could be extended to sample pixels from the canvas
    // and use that data to further modify the sound
    // For now, we'll rely on the parameters passed to updateSound
  }
}
