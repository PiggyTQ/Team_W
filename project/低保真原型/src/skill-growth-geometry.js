// The approved sprite is 1684 × 934. Labels, leaf-stem anchors and water
// routes use this ONE coordinate system; career/skill identities never change.
export const growthFrame={x:-100,y:-102,width:1884,height:1060};
export const growthArtSize={width:1684,height:934};
export const growthTiming=Object.freeze({single:980,branch:1550,arrival:560,branchStart:900});
export const rootWaterPath='M555 866 C615 856 679 853 713 814 C750 777 765 719 778 654';
const pose=(point,tilt,twig,route)=>({point,tilt,twig,route});
const lowLeft='M778 654 C718 591 666 569 585 565 C473 551 410 629 323 613';
const highLeft='M778 654 C753 578 776 503 733 451 C687 408 612 372 531 346 C477 330 447 320 419 308';
const highRight='M778 654 C805 546 857 454 940 401';
const highLeader=' C1010 355 1114 292 1186 249 C1260 206 1310 190 1355 196';
const lowRight='M857 682 C878 617 919 570 967 543 C1036 494 1098 513 1167 540';
export const botanicalBoughs=[
  {label:'M278 604 C365 638 432 580 505 570 S620 566 665 589',hit:[479,586,-5,378],
    main:lowLeft+' C274 580 223 554 162 556 C115 546 90 531 70 501',
    forks:[
      pose([414,467],28,'M365 503 C388 501 401 482 414 467',lowLeft+' C318 581 311 548 325 524 C343 500 373 510 391 495 C400 485 408 477 414 467'),
      pose([211,400],-9,'M203 460 C214 441 216 422 211 400',lowLeft+' C274 580 244 568 217 562 C209 538 183 490 203 460 C214 441 216 422 211 400'),
      pose([70,501],-33,'M98 545 C86 534 76 520 70 501',lowLeft+' C274 580 223 554 162 556 C115 546 90 531 70 501'),
      pose([260,624],-64,'M310 619 C291 617 279 624 260 624',lowLeft+' C298 617 281 625 260 624')],
    clusters:[{point:[335,611],kind:'left',size:150,tilt:-28},{point:[206,557],kind:'fan',size:142,tilt:-37},{point:[342,510],kind:'right',size:123,tilt:20},{point:[208,461],kind:'left',size:116,tilt:-10}]},
  {label:'M393 303 C453 340 515 345 571 367 S666 408 707 444',hit:[551,365,19,366],
    main:highLeft+' C369 262 323 257 300 201 C293 176 266 149 246 138',
    forks:[
      pose([666,157],38,'M600 184 C630 198 647 176 666 157',highLeft+' C483 286 506 261 523 224 C541 193 570 192 600 184 C630 198 647 176 666 157'),
      pose([538,28],33,'M481 86 C510 64 525 46 538 28',highLeft+' C407 258 392 203 402 166 C414 127 451 104 481 86 C510 64 525 46 538 28'),
      pose([246,138],-38,'M300 201 C293 176 266 149 246 138',highLeft+' C369 262 323 257 300 201 C293 176 266 149 246 138'),
      pose([403,60],-12,'M411 124 C411 87 407 76 403 60',highLeft+' C407 258 392 203 402 166 C411 124 411 87 403 60')],
    clusters:[{point:[407,278],kind:'left',size:162,tilt:-25},{point:[481,246],kind:'right',size:154,tilt:19},{point:[412,143],kind:'fan',size:144,tilt:12},{point:[320,229],kind:'left',size:122,tilt:-33}]},
  {label:'M893 425 C963 381 1021 343 1080 309 S1206 240 1262 219',hit:[1079,314,-28,387],
    main:highRight+highLeader+' C1436 224 1505 181 1576 163',
    forks:[
      pose([911,180],-12,'M903 229 C914 209 918 194 911 180',highRight+' C911 363 882 333 868 297 C860 272 884 252 903 229 C914 209 918 194 911 180'),
      pose([1035,116],-35,'M1075 174 C1064 150 1046 138 1035 116',highRight+' C975 376 1017 352 1048 333 C1082 292 1098 247 1082 201 C1073 166 1048 141 1035 116'),
      pose([1480,78],39,'M1439 128 C1457 112 1470 96 1480 78',highRight+highLeader+' C1403 163 1421 145 1439 128 C1457 112 1470 96 1480 78'),
      pose([1576,163],67,'M1505 181 C1537 181 1560 170 1576 163',highRight+highLeader+' C1436 224 1505 181 1576 163')],
    clusters:[{point:[1041,334],kind:'left',size:160,tilt:-17},{point:[1184,248],kind:'fan',size:152,tilt:27},{point:[1370,200],kind:'right',size:163,tilt:18},{point:[901,296],kind:'left',size:120,tilt:-15},{point:[1265,216],kind:'fan',size:136,tilt:5}]},
  {label:'M959 532 C1023 502 1072 514 1138 537 S1241 574 1312 550',hit:[1129,537,3,395],
    main:lowRight+' C1250 578 1312 552 1370 501 C1399 467 1391 437 1427 425 C1456 428 1486 426 1511 403 C1527 388 1539 382 1539 378',
    forks:[
      pose([1358,367],14,'M1325 451 C1334 433 1315 412 1333 397 C1341 382 1355 376 1358 367',lowRight+' C1226 568 1247 530 1270 500 C1286 479 1316 479 1325 451 C1334 433 1315 412 1333 397 C1341 382 1355 376 1358 367'),
      pose([1539,378],37,'M1511 403 C1527 388 1539 382 1539 378',lowRight+' C1250 578 1312 552 1370 501 C1399 467 1391 437 1427 425 C1456 428 1486 426 1511 403 C1527 388 1539 382 1539 378'),
      pose([1632,510],45,'M1590 548 C1607 536 1620 524 1632 510',lowRight+' C1250 578 1312 552 1370 501 C1406 523 1439 518 1481 548 C1549 593 1604 540 1632 510'),
      pose([1552,560],56,'M1512 575 C1526 575 1541 568 1552 560',lowRight+' C1250 578 1312 552 1370 501 C1406 530 1439 518 1481 548 C1500 561 1512 575 1552 560')],
    clusters:[{point:[1229,557],kind:'left',size:158,tilt:-18},{point:[1328,435],kind:'fan',size:142,tilt:17},{point:[1400,460],kind:'right',size:154,tilt:22},{point:[1512,563],kind:'right',size:132,tilt:39}]}
];
export function growthPosition([x,y]) {return {left:((x-growthFrame.x)/growthFrame.width*100)+'%',top:((y-growthFrame.y)/growthFrame.height*100)+'%'};}
export function waterRoute(bough,index) {
  const route=botanicalBoughs[bough]?.forks[index]?.route;
  if(!route)return null;
  if(bough===3)return 'M555 866 C615 856 679 853 713 814 C780 780 817 731 857 682'+route.replace(/^M857 682/,' L857 682');
  return rootWaterPath+route.replace(/^M778 654/,' L778 654');
}
