// Real-time Procedural Audio Synth for BUSSIN - Bus Simulator India using Web Audio API

class AudioSynth {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private isReverseBeeping = false;
  private reverseInterval: any = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // cash collection fare chime
  playCoinSale() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
      
      osc2.frequency.setValueAtTime(1567.98, now); // G6
      osc2.frequency.exponentialRampToValueAtTime(2093.00, now + 0.15); // C7
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (e) {}
  }

  // Pneumatic release sound for hydraulic passenger entries
  playDoorPneumatic() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Generate White Noise for air leakage (Psssshh!)
      const bufferSize = this.ctx.sampleRate * 0.7; // 0.7 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.65);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start();
      
      // Add metallic clank lock at finish
      const metalOsc = this.ctx.createOscillator();
      const metalGain = this.ctx.createGain();
      metalOsc.type = 'triangle';
      metalOsc.frequency.setValueAtTime(95, now + 0.55);
      metalGain.gain.setValueAtTime(0, now);
      metalGain.gain.setValueAtTime(0.08, now + 0.55);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      metalOsc.connect(metalGain);
      metalGain.connect(this.ctx.destination);
      metalOsc.start(now + 0.55);
      metalOsc.stop(now + 0.65);
    } catch (e) {}
  }

  playCheatSuccess() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6 arpeggio
      freqs.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.22);
      });
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  playCheatFailure() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // HORN 1: Classic Indian Dual Pressure Air Horn (Roaring & vibrating)
  playPressureHorn() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const biquad = this.ctx.createBiquadFilter();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(370, now); // frequency 1
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(373, now); // chorused slightly out of tune for fatness
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(185, now); // sub bass thomp
      
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      
      osc1.connect(biquad);
      osc2.connect(biquad);
      osc3.connect(biquad);
      biquad.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start();
      osc2.start();
      osc3.start();
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
      osc3.stop(now + 0.85);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // HORN 2: Catchy rhythmic "Telolet" musical horn (Indonesian/South Asian favorite)
  playTeloletHorn() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Melody notes: F#5 (739.99), G#5 (830.61), A#5 (932.33), C#6 (1108.73), A#5 (932.33), C#6 (1108.73)
      const melody = [739.99, 830.61, 932.33, 1108.73, 932.33, 1108.73];
      const durations = [0.12, 0.12, 0.12, 0.18, 0.12, 0.24];
      
      let nextStartTime = now;
      melody.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const subOsc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();
        
        osc.type = 'triangle';
        subOsc.type = 'sine';
        
        osc.frequency.setValueAtTime(freq, nextStartTime);
        subOsc.frequency.setValueAtTime(freq / 2, nextStartTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, nextStartTime);
        
        gain.gain.setValueAtTime(0.0, nextStartTime);
        gain.gain.linearRampToValueAtTime(0.15, nextStartTime + 0.02);
        gain.gain.setValueAtTime(0.15, nextStartTime + durations[idx] - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, nextStartTime + durations[idx]);
        
        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(nextStartTime);
        subOsc.start(nextStartTime);
        osc.stop(nextStartTime + durations[idx] + 0.02);
        subOsc.stop(nextStartTime + durations[idx] + 0.02);
        
        nextStartTime += durations[idx] + 0.04;
      });
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // HORN 3: Traditional "Horn OK Please" musical arpeggio
  playMusicalHorn() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Traditional Indian thumping truck horn sequence:
      // Middle C (261.63) -> E4 (329.63) -> G4 (392.00) -> C5 (523.25) -> C5 (523.25) -> G4 (392.00) -> E4 (329.63)
      const scale = [261.63, 329.63, 392.00, 523.25, 523.25, 392.00, 261.63];
      const beats = [0.14, 0.14, 0.14, 0.18, 0.12, 0.12, 0.22];
      
      let nextTime = now;
      scale.forEach((freq, i) => {
        const osc1 = this.ctx!.createOscillator();
        const osc2 = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, nextTime);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.01, nextTime); // detune effect
        
        gain.gain.setValueAtTime(0, nextTime);
        gain.gain.linearRampToValueAtTime(0.12, nextTime + 0.02);
        gain.gain.setValueAtTime(0.12, nextTime + beats[i] - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, nextTime + beats[i]);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc1.start(nextTime);
        osc2.start(nextTime);
        osc1.stop(nextTime + beats[i] + 0.02);
        osc2.stop(nextTime + beats[i] + 0.02);
        
        nextTime += beats[i] + 0.03;
      });
    } catch (e) {}
  }

  playHorn() {
    this.playPressureHorn(); // Default fallback
  }

  playCrash() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const bufferSize = this.ctx.sampleRate * 0.55;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(5, now + 0.5);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  startEngine() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.engineOsc) return; 

      const now = this.ctx.currentTime;
      
      // Starter crank sound
      const crank = this.ctx.createOscillator();
      const crankGain = this.ctx.createGain();
      crank.type = 'sawtooth';
      crank.frequency.setValueAtTime(80, now);
      crank.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      crankGain.gain.setValueAtTime(0.12, now);
      crankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      crank.connect(crankGain);
      crankGain.connect(this.ctx.destination);
      crank.start();
      crank.stop(now + 0.35);

      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.lowpass = this.ctx.createBiquadFilter();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(42, now); // Deep diesel cylinder idle rattle

      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.setValueAtTime(140, now); // low pitch rumble filter

      this.engineGain.gain.setValueAtTime(0.0, now);
      this.engineGain.gain.linearRampToValueAtTime(0.1, now + 0.55);

      this.engineOsc.connect(this.lowpass);
      this.lowpass.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  updateEnginePitch(speed: number, maxSpeed: number = 30) {
    try {
      if (!this.engineOsc || !this.ctx) return;
      const pct = Math.min(1, Math.max(0, Math.abs(speed) / maxSpeed));
      const targetFreq = 40 + pct * 150; // Diesel heavy cylinder rev scales from 40Hz to 190Hz
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.12);
      
      if (this.lowpass) {
        const targetCutoff = 130 + pct * 320;
        this.lowpass.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.12);
      }
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // Reverse warning bleep loops
  startReverseBeeps() {
    if (this.isReverseBeeping) return;
    this.isReverseBeeping = true;
    
    const playBeep = () => {
      try {
        this.initCtx();
        if (!this.ctx || !this.isReverseBeeping) return;
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(900, now); // nostalgic retrograde backup whistle beep
        g.gain.setValueAtTime(0.04, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(now + 0.3);
      } catch (e) {}
    };

    playBeep();
    this.reverseInterval = setInterval(playBeep, 700);
  }

  stopReverseBeeps() {
    this.isReverseBeeping = false;
    if (this.reverseInterval) {
      clearInterval(this.reverseInterval);
      this.reverseInterval = null;
    }
  }

  stopEngine() {
    try {
      this.stopReverseBeeps();
      if (this.engineOsc && this.ctx) {
        const now = this.ctx.currentTime;
        this.engineGain?.gain.setTargetAtTime(0.0, now, 0.2);
        const osc = this.engineOsc;
        setTimeout(() => {
          try {
            osc.stop();
          } catch (e) {}
        }, 220);
        this.engineOsc = null;
        this.engineGain = null;
        this.lowpass = null;
      }
    } catch (e) {
      console.warn("Audio error", e);
    }
  }
}

export const synth = new AudioSynth();
