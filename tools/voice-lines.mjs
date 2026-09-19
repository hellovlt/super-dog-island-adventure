// Every line Super Dog can say out loud, gathered from the game's own data so the recordings
// can never drift away from the text on screen.
import {STORIES, storyText} from '../stories3d.js';
import {createWorld} from '../campaign3d.js';
import {lineId} from '../voice3d.js';

// Lines the game speaks during play that are not stored in the world data.
export const UI_LINES={
 welcome:'Welcome to Super Dog Island Adventure! Press the big green button to start exploring.',
 firstKey:'A golden key! Find a friend in a cage and press E to set them free.',
 checkpoint:'Checkpoint saved. Your hearts are full again.',
 hurt:'Ouch! Touch a golden flag to fill your hearts.',
 dead:'Never mind. Every hero falls sometimes. Back to the flag we go.',
 gate:'A rescue bubble carried you back. Rescue all three friends to open the gate!',
 bossReady:'All three friends are free. Cross the bridge and meet the giant.',
 bossTired:'The giant is tired! Move closer and bark with X.',
 glideUnlocked:'New power! Hold jump while you are falling to glide on your cape.',
 rushStart:'Bone Rush! Collect all twelve golden bones before the clock runs out.',
 rushWon:'You did it! Every golden bone is yours.',
 rushLost:'Time is up. Try the stone again whenever you like.',
 wardrobe:'Welcome to the dog house. Your bones can buy capes, hats and colours.',
 drawing:'Draw anything you like, and Super Dog will wear it on his cape.',
 friends:'Ask a grown-up to share your code, and your friends can play on this island too.',
};

export function voiceInventory(){
 const lines=[];
 for(const story of STORIES)lines.push({id:lineId.story(story.id),text:storyText(story),about:`story: ${story.title}`});
 for(let level=0;level<5;level++){
  const world=createWorld(level);
  world.NPCS[0].lines.forEach((text,index)=>lines.push({id:lineId.guide(level,index),text,about:`${world.NPCS[0].name}`}));
  world.FRIENDS.forEach((friend,index)=>lines.push({id:lineId.friend(level,index),text:friend.line,about:`${friend.name} says thanks`}));
 }
 for(const [name,text] of Object.entries(UI_LINES))lines.push({id:lineId.ui(name),text,about:'in game'});
 return lines;
}
