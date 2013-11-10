function Synth(audiolet, frequency) {
  AudioletGroup.call(this, audiolet, 0, 1);
  // Basic wave
  this.saw = new Saw(audiolet, frequency);

  // Gain envelope
  this.gain = new Gain(audiolet);
  this.env = new PercussiveEnvelope(audiolet, 1, 0.1, 0.1,
    function () {
      this.audiolet.scheduler.addRelative(0, this.remove.bind(this));
    }
    .bind(this)
  );

  // Main signal path
  this.saw.connect(this.gain);
  this.gain.connect(this.outputs[0]);

  // Envelope
  this.env.connect(this.gain, 0, 1);
}

extend(Synth, AudioletGroup);

