// Gamepad support: standard-mapping controllers drive the same actions as the keyboard.
export const BUTTON={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,BACK:8,START:9,LS:10,RS:11,UP:12,DOWN:13,LEFT:14,RIGHT:15};
const DEAD=.18;
export const deadzone=v=>Math.abs(v)<DEAD?0:(v-Math.sign(v)*DEAD)/(1-DEAD);
const clamp=v=>Math.max(-1,Math.min(1,v));

// Turns one gamepad snapshot into movement, camera, and edge-triggered actions.
// `previous` is the pressed-state array returned last frame, so a held button fires once.
export function readPad(pad,previous=[]){
 const down=i=>!!pad?.buttons?.[i]?.pressed,fresh=i=>down(i)&&!previous[i],axis=i=>deadzone(pad?.axes?.[i]||0);
 return {
  x:clamp(axis(0)+(down(BUTTON.RIGHT)?1:0)-(down(BUTTON.LEFT)?1:0)),
  z:clamp(axis(1)+(down(BUTTON.DOWN)?1:0)-(down(BUTTON.UP)?1:0)),
  camX:axis(2),camY:axis(3),zoom:(down(BUTTON.LT)?1:0)-(down(BUTTON.LB)?1:0),
  jump:fresh(BUTTON.A),glide:down(BUTTON.A),bark:fresh(BUTTON.X),dash:fresh(BUTTON.B)||fresh(BUTTON.RB)||fresh(BUTTON.RT),interact:fresh(BUTTON.Y),
  pause:fresh(BUTTON.START),confirm:fresh(BUTTON.A),back:fresh(BUTTON.B),recenter:fresh(BUTTON.RS)||fresh(BUTTON.LS),
  focus:fresh(BUTTON.DOWN)||fresh(BUTTON.RIGHT)?1:fresh(BUTTON.UP)||fresh(BUTTON.LEFT)?-1:0,
  pressed:Array.from(pad?.buttons||[],b=>!!b?.pressed),
 };
}
// How hard each event shakes the controller: [strength 0–1, milliseconds].
export const RUMBLE={hurt:[.75,240],bossHit:[.5,170],dead:[.9,420],won:[.6,520],rescue:[.35,200],dash:[.18,90],land:[.3,90],fall:[.5,260],rushWon:[.45,300]};
