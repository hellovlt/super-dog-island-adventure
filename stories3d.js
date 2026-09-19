// The story book: twenty little stories that unlock as the adventure is played.
// Each one is short enough to be read aloud in about twenty seconds.
export const STORY_COUNT=20;

const world=(level,id,title,lines)=>({id,level,kind:'world',title,lines});
const secret=(level,slot,title,lines)=>({id:`story-secret-${level}-${slot}`,level,kind:'secret',slot,egg:`egg-${level}-${slot}`,title,lines});
const victory=(level,title,lines)=>({id:`story-win-${level}`,level,kind:'victory',title,lines});

export const STORIES=[
 world(0,'story-world-0','The First Page',[
  'It began with a sheet of paper and a box of crayons.',
  'A child drew an island, three friends, and a small brown dog.',
  'Then they drew a cape on the dog, because every hero needs one.',
  'The dog shook the paper dust off his ears, barked once, and the island woke up.',
 ]),
 secret(0,0,'The First Drawing',[
  'Behind the trees on the southern shore, Super Dog found a drawing pinned to a post.',
  'It was the very first picture the child ever made of him: a wobbly dog with enormous ears.',
  'He liked it more than any photograph.',
  'Thank you to the young creator of Super Dog.',
 ]),
 secret(0,1,'Dog Moon',[
  'On clear nights, a small moon rises over Sunny Island.',
  'Super Dog is certain it is made of bone, and one day he will jump high enough to sniff it.',
  'Until then, he practises his double jump every evening.',
  'The moon left him a star antenna, so he can hear it humming.',
 ]),
 victory(0,'The Snake King Says Sorry',[
  'The Snake King was not wicked. He was only very, very long, and nobody wanted to share a bench with him.',
  'So he locked up the friends to keep them close.',
  'After a loud bark and a longer talk, he let them go and asked to be invited next time.',
  'Now he holds the skipping rope at every island party.',
 ]),

 world(1,'story-world-1','The Tall Umbrellas',[
  'Beyond the bridge, mushrooms grow taller than houses.',
  'When it rains, the whole kingdom stands underneath them and nobody gets wet.',
  'Professor Toad measures each mushroom every morning and writes the number in a small blue book.',
  'He says the tallest one is still growing. Super Dog intends to climb it.',
 ]),
 secret(1,0,'Mushroom Tea Party',[
  'Under the widest cap, eleven mushrooms were having tea.',
  'They poured a cup for Super Dog and told him the rules.',
  'Rule one: you may dunk your biscuit. Rule two: never eat the cup.',
  'Super Dog broke rule two. The cup forgave him.',
 ]),
 secret(1,1,'The Tiny King',[
  'The smallest mushroom in the kingdom wears the biggest slippers.',
  'He is king because he asked politely and nobody else wanted the job.',
  'His throne is a pebble, and his crown keeps sliding over his eyes.',
  'When he laughs, all the mushrooms wobble.',
 ]),
 victory(1,'The Giant Who Could Not Bend',[
  'The Mushroom Giant had never seen his own feet.',
  'He stomped because he could not see where he was going, and the cages were simply in the way.',
  'Super Dog barked directions until the giant sat down.',
  'Now the giant carries the friends on his cap, and he always knows exactly where his feet are.',
 ]),

 world(2,'story-world-2','The Quiet Snow',[
  'Crystal Winter is the quietest world of all.',
  'Snow lands on the ice paths without making a sound, and even barks come back softer.',
  'Captain Penguin keeps a lantern lit so nobody gets lost in the white.',
  'He says the cold is only a bit rude. Underneath, it is friendly.',
 ]),
 secret(2,0,'Snow Dog',[
  'Someone had built a dog out of snow, with stones for eyes and a stick for a tail.',
  'It had waited all winter for a scarf.',
  'Super Dog gave away his spare cape without thinking twice.',
  'The snow dog has been smiling ever since, which is difficult when you are made of snow.',
 ]),
 secret(2,1,'The Frozen Woof',[
  'A long time ago, a bark escaped on the coldest night of the year, and froze solid in the air.',
  'It hung there for a hundred winters, waiting.',
  'Super Dog breathed on it until it thawed.',
  'Out came a tiny melody instead of a bark, and it followed him home.',
 ]),
 victory(2,'Frost Fang Gets Warm',[
  'Frost Fang charged at everything because nothing ever charged back.',
  'Underneath the ice, she was mostly lonely.',
  'When Super Dog stood his ground and then offered his paw, she stopped running.',
  'Now she gives the friends rides down the ice paths, and everyone screams happily.',
 ]),

 world(3,'story-world-3','The Grumpy Mountain',[
  'Volcano Island grumbles in its sleep.',
  'Sal the Salamander says the mountain is not angry, only warm, and warmth has to go somewhere.',
  'The cracks glow orange, so everybody learns to jump early here.',
  'On a good day, the mountain puffs a smoke ring, and the whole island claps.',
 ]),
 secret(3,0,'Dragon Pizza',[
  'The Fire Dragon bakes pizza without an oven.',
  'The secret is one long breath and a very steady paw.',
  'Super Dog was given the first slice and burnt his tongue immediately.',
  'It was, he insists, worth it.',
 ]),
 secret(3,1,'The Dancing Volcano',[
  'Stand still on the black rock and you will feel it: the mountain keeps a beat.',
  'Boom, boom, rest. Boom, boom, rest.',
  'Super Dog tapped his paw along until his tail joined in.',
  'Now he has a dancing walk, and the mountain has a dance partner.',
 ]),
 victory(3,'The Dragon Who Was Too Hot',[
  'The Fire Dragon was grumpy the way anyone is grumpy when they cannot cool down.',
  'Every sneeze set something alight, so he kept away from everybody.',
  'Super Dog barked up a gust of sea wind, and the dragon sighed with relief.',
  'He bakes for the whole island now, and the friends bring the plates.',
 ]),

 world(4,'story-world-4','The Last Page',[
  'Sky Castle floats on the final page of the drawing.',
  'The clouds here are soft enough to nap on, which is dangerous when there is rescuing to do.',
  'Wise Owl watches the stairs and counts everyone who climbs them.',
  'She says the best stories are the ones that keep going after the last page.',
 ]),
 secret(4,0,'World Creator',[
  'High above the clouds, Super Dog found a crayon as tall as a tree.',
  'It was the one the child used to draw five whole worlds.',
  'He looked at it for a long time, then wagged his tail.',
  'Imagination is the greatest superpower of all, and it fits in one small hand.',
 ]),
 secret(4,1,'A Crown for Super Dog',[
  'At the top of the castle, the friends were waiting with something round and shiny.',
  'It was a crown, made from a bent hoop and a lot of glitter.',
  'They put it on his head and cheered until the clouds shook.',
  'Super Dog, you earned it.',
 ]),
 victory(4,'The Cloud Emperor Comes Down',[
  'The Cloud Emperor had sat above the world for so long that he had forgotten how to land.',
  'From up there, everyone looked small enough to move around like toys.',
  'Super Dog barked until the emperor drifted down and met the friends face to face.',
  'He has stayed for tea every afternoon since.',
 ]),
];

export const storyById=id=>STORIES.find(s=>s.id===id)||null;
export const storiesForLevel=level=>STORIES.filter(s=>s.level===level);
export const storyText=story=>story.lines.join(' ');
// A story opens when the world is reached, its secret is found, or its giant is beaten.
export function isStoryOpen(story,{unlocked=1,secrets=new Set(),progress={},level=0}={}){
 if(story.kind==='world')return story.level<unlocked||story.level===level;
 if(story.kind==='secret')return secrets.has?.(story.egg)??false;
 return progress[story.level]?.won===true;
}
export const openStories=state=>STORIES.filter(s=>isStoryOpen(s,state));
