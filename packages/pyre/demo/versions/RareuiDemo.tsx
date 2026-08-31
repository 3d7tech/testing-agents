import { EmberDial } from '../../versions/rareui/ember-dial';

export function RareuiDemo() {
  return (
    <div className="demo-card" style={{ background: '#0a0604' }}>
      <EmberDial size={300} showFps />
    </div>
  );
}
