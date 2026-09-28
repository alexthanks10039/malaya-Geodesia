import assert from "node:assert/strict";
import {isContentType,normalizeContentData,slugify} from "../lib/cms";

const cases=[
  ["Площадь участка 11 соток","ploshad-uchastka-11-sotok"],
  ["  Топосъёмка / Алматы  ","toposemka-almaty"],
  ["Құрылыс / Геодезия","qurylys-geodeziya"],
] as const;

for(const [input,expected] of cases)assert.equal(slugify(input),expected);

assert.equal(isContentType("case"),true);
assert.equal(isContentType("service"),true);
assert.equal(isContentType("page"),true);
assert.equal(isContentType("unknown"),false);

assert.deepEqual(normalizeContentData({title:"Тест",slug:"old"}),{title:"Тест",slug:"old"});
assert.throws(()=>normalizeContentData({description:"Без названия"}),/content title is required/);

console.log("CMS smoke: OK");
