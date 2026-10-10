export class PointerTracker {
  constructor(target) {
    this.target = target;
    this.x = 0;
    this.y = 0;
    this.active = false;

    this.handleMove = this.handleMove.bind(this);
    this.handleLeave = this.handleLeave.bind(this);
    this.handleTouch = this.handleTouch.bind(this);

    target.addEventListener('mousemove', this.handleMove);
    target.addEventListener('mouseleave', this.handleLeave);
    target.addEventListener('touchmove', this.handleTouch, { passive: false });
    target.addEventListener('touchstart', this.handleTouch, { passive: false });
    target.addEventListener('touchend', this.handleLeave);
  }

  handleMove(event) {
    const rect = this.target.getBoundingClientRect();
    this.x = event.clientX - rect.left;
    this.y = event.clientY - rect.top;
    this.active = true;
  }

  handleLeave() {
    this.active = false;
  }

  handleTouch(event) {
    if (!event.touches.length) return;
    const touch = event.touches[0];
    this.handleMove({ clientX: touch.clientX, clientY: touch.clientY });
    event.preventDefault();
  }
}
