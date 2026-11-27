import test from 'node:test';
import assert from 'node:assert/strict';
import {careerReadingPosition,careerReadingSectionUrl,careerReadingSections} from '../src/career-reading-navigation.js';

test('all reading sections survive URL refresh; unknown sections recover',()=>{
 for(const [id] of careerReadingSections){assert.equal(careerReadingPosition('/careers?career=data&section='+id).active,id);}
 assert.deepEqual(careerReadingPosition('/careers?career=data&section=missing'),{active:'overview',hash:'',invalidSection:true});
 assert.equal(careerReadingPosition('/careers?career=data').active,'overview');
});
test('source and output deep links reveal their owning panel rather than a hidden target',()=>{
 assert.equal(careerReadingPosition('/careers?career=data&section=overview#career-source-onet').active,'sources');
 assert.equal(careerReadingPosition('/careers?career=data#career-deliverables').active,'work');
 assert.equal(careerReadingPosition('/careers?career=ai#trial-source-d1').active,'practice');
 assert.equal(careerReadingPosition('/careers?career=data#career-growth').active,'growth');
});
test('tab URLs keep list context, replace the old source hash and retain no extra personal text',()=>{
 const original='/careers?career=data&q=SQL&source=materials&group=data&section=sources#career-source-old';
 const next=careerReadingSectionUrl(original,'practice');
 const parsed=new URL(next,'https://example.invalid');
 assert.equal(parsed.hash,'');assert.equal(parsed.searchParams.get('section'),'practice');
 for(const [key,value]of [['career','data'],['q','SQL'],['source','materials'],['group','data']])assert.equal(parsed.searchParams.get(key),value);
 const source=careerReadingSectionUrl(next,'sources','career-source-original');
 assert.equal(careerReadingPosition(source).hash,'#career-source-original');
 assert.equal(careerReadingPosition(careerReadingSectionUrl(source,'unknown')).active,'overview');
});
