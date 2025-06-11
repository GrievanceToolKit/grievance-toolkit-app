"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

interface TrainingExample {
  id: string;
  steward_correction: string;
  created_at: string;
}

function extractArticles(text: string): string[] {
  if (!text) return [];
  const regex = /Article\s+\d+[A-Za-z]*/gi;
  return Array.from(new Set((text.match(regex) || []).map(a => a.trim())));
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  // Simple: split on non-word, filter stopwords, dedupe, min length 4
  const stopwords = new Set(['the','and','for','with','that','from','this','have','not','are','was','but','all','has','can','will','any','may','per','shall','must','each','such','who','had','his','her','its','their','they','you','she','him','our','out','due','use','see','been','more','than','into','upon','when','over','only','also','other','which','where','while','after','before','under','above','about','between','during','against','without','within','because','since','until','unless','every','each','those','these','there','here','very','just','even','some','most','many','much','like','make','made','could','would','should','being','does','did','doing','gets','got','getting','given','give','given','takes','taken','taking','says','said','saying','goes','went','gone','going','see','seen','seeing','come','comes','coming','put','puts','putting','let','lets','letting','get','gets','getting','got','gotten','make','makes','making','made','use','uses','using','used','work','works','working','worked','need','needs','needing','needed','want','wants','wanting','wanted','know','knows','knowing','knew','known','think','thinks','thinking','thought','thoughts','say','says','saying','said','see','sees','seeing','saw','seen','look','looks','looking','looked','find','finds','finding','found','give','gives','giving','gave','given','tell','tells','telling','told','ask','asks','asking','asked','show','shows','showing','showed','shown','call','calls','calling','called','try','tries','trying','tried','leave','leaves','leaving','left','feel','feels','feeling','felt','keep','keeps','keeping','kept','let','lets','letting','put','puts','putting','mean','means','meaning','meant','seem','seems','seeming','seemed','help','helps','helping','helped','start','starts','starting','started','run','runs','running','ran','move','moves','moving','moved','live','lives','living','lived','believe','believes','believing','believed','hold','holds','holding','held','bring','brings','bringing','brought','happen','happens','happening','happened','write','writes','writing','wrote','written','provide','provides','providing','provided','sit','sits','sitting','sat','stand','stands','standing','stood','lose','loses','losing','lost','pay','pays','paying','paid','meet','meets','meeting','met','include','includes','including','included','continue','continues','continuing','continued','set','sets','setting','set','learn','learns','learning','learned','change','changes','changing','changed','lead','leads','leading','led','understand','understands','understanding','understood','watch','watches','watching','watched','follow','follows','following','followed','stop','stops','stopping','stopped','create','creates','creating','created','speak','speaks','speaking','spoke','spoken','read','reads','reading','read','allow','allows','allowing','allowed','add','adds','adding','added','spend','spends','spending','spent','grow','grows','growing','grew','grown','open','opens','opening','opened','walk','walks','walking','walked','win','wins','winning','won','offer','offers','offering','offered','remember','remembers','remembering','remembered','love','loves','loving','loved','consider','considers','considering','considered','appear','appears','appearing','appeared','buy','buys','buying','bought','wait','waits','waiting','waited','serve','serves','serving','served','die','dies','dying','died','send','sends','sending','sent','expect','expects','expecting','expected','build','builds','building','built','stay','stays','staying','stayed','fall','falls','falling','fell','fallen','cut','cuts','cutting','reach','reaches','reaching','reached','kill','kills','killing','killed','remain','remains','remaining','remained','suggest','suggests','suggesting','suggested','raise','raises','raising','raised','pass','passes','passing','passed','sell','sells','selling','sold','require','requires','requiring','required','report','reports','reporting','reported','decide','decides','deciding','decided','pull','pulls','pulling','pulled','return','returns','returning','returned','explain','explains','explaining','explained','hope','hopes','hoping','hoped','develop','develops','developing','developed','carry','carries','carrying','carried','break','breaks','breaking','broke','broken','receive','receives','receiving','received','agree','agrees','agreeing','agreed','support','supports','supporting','supported','hit','hits','hitting','hit','produce','produces','producing','produced','eat','eats','eating','ate','eaten','cover','covers','covering','covered','catch','catches','catching','caught','draw','draws','drawing','drew','drawn','choose','chooses','choosing','chose','chosen','cause','causes','causing','caused','point','points','pointing','pointed','listen','listens','listening','listened','realize','realizes','realizing','realized','place','places','placing','placed','close','closes','closing','closed','involve','involves','involving','involved','fit','fits','fitting','fitted','notice','notices','noticing','noticed','wonder','wonders','wondering','wondered','express','expresses','expressing','expressed','finish','finishes','finishing','finished','save','saves','saving','saved','protect','protects','protecting','protected','lie','lies','lying','lay','laid','refer','refers','referring','referred','introduce','introduces','introducing','introduced','connect','connects','connecting','connected','announce','announces','announcing','announced','state','states','stating','stated','add','adds','adding','added','remove','removes','removing','removed','visit','visits','visiting','visited','imagine','imagines','imagining','imagined','finish','finishes','finishing','finished','plan','plans','planning','planned','describe','describes','describing','described','join','joins','joining','joined','save','saves','saving','saved','reduce','reduces','reducing','reduced','miss','misses','missing','missed','enjoy','enjoys','enjoying','enjoyed','risk','risks','risking','risked','force','forces','forcing','forced','overtime','surveillance','reassignment']);
  return Array.from(new Set(
    text.toLowerCase().split(/[^a-z0-9]+/g)
      .filter(w => w.length > 3 && !stopwords.has(w))
  ));
}

function getCombinations(arr: string[]): string[][] {
  if (arr.length < 2) return [];
  const combos: string[][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      combos.push([arr[i], arr[j]].sort());
    }
  }
  return combos;
}

export default function PatternsPage() {
  const [loading, setLoading] = useState(true);
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});
  const [comboCounts, setComboCounts] = useState<Record<string, number>>({});
  const [keywordCounts, setKeywordCounts] = useState<Record<string, number>>({});
  const [keywordToArticles, setKeywordToArticles] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    async function fetchRows() {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_training_queue')
        .select('id,steward_correction,created_at')
        .not('steward_correction', 'is', null);
      if (!data || error) {
        setLoading(false);
        return;
      }
      // Article counts
      const aCounts: Record<string, number> = {};
      // Article combos
      const cCounts: Record<string, number> = {};
      // Keyword counts
      const kCounts: Record<string, number> = {};
      // Keyword to article links
      const k2a: Record<string, Record<string, number>> = {};
      data.forEach((row: TrainingExample) => {
        const articles = extractArticles(row.steward_correction);
        const keywords = extractKeywords(row.steward_correction);
        // Article counts
        articles.forEach(a => { aCounts[a] = (aCounts[a] || 0) + 1; });
        // Article combos
        getCombinations(articles).forEach(combo => {
          const key = combo.join(' + ');
          cCounts[key] = (cCounts[key] || 0) + 1;
        });
        // Keyword counts
        keywords.forEach(k => { kCounts[k] = (kCounts[k] || 0) + 1; });
        // Keyword to article links
        keywords.forEach(k => {
          if (!k2a[k]) k2a[k] = {};
          articles.forEach(a => { k2a[k][a] = (k2a[k][a] || 0) + 1; });
        });
      });
      setArticleCounts(aCounts);
      setComboCounts(cCounts);
      setKeywordCounts(kCounts);
      setKeywordToArticles(k2a);
      setLoading(false);
    }
    fetchRows();
  }, []);

  // --- Export ---
  function handleExport(type: 'csv' | 'json') {
    const exportObj = {
      articles: articleCounts,
      combos: comboCounts,
      keywords: keywordCounts,
      keywordToArticles,
    };
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pattern_mining.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV: Only export top 10 of each
      let csv = 'Type,Key,Value\n';
      Object.entries(articleCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>{
        csv += `Article,${k},${v}\n`;
      });
      Object.entries(comboCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>{
        csv += `Combo,${k},${v}\n`;
      });
      Object.entries(keywordCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,v])=>{
        csv += `Keyword,${k},${v}\n`;
      });
      csv += 'Keyword,Article,Value\n';
      Object.entries(keywordToArticles).forEach(([k,arts])=>{
        Object.entries(arts).forEach(([a,v])=>{
          csv += `Keyword→Article,${k}→${a},${v}\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pattern_mining.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // --- Word cloud: just a tag cloud for now ---
  const topKeywords = Object.entries(keywordCounts).sort((a,b)=>b[1]-a[1]).slice(0,30);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Pattern Mining Analytics</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" onClick={()=>handleExport('csv')}>Export CSV</Button>
        <Button size="sm" onClick={()=>handleExport('json')}>Export JSON</Button>
      </div>
      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading...</div>
      ) : (
        <>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Top 10 Most Corrected Articles</h2>
          <ul className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(articleCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([art, count]) => (
              <li key={art} className="bg-zinc-800 rounded px-2 py-1 text-center">{art}: <b>{count}</b></li>
            ))}
          </ul>
        </div>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Keyword Word Cloud</h2>
          <div className="flex flex-wrap gap-2">
            {topKeywords.map(([k, v]) => (
              <span key={k} style={{ fontSize: `${Math.max(1, Math.log2(v+1))*1.2}em` }} className="bg-zinc-700 rounded px-2 py-1">
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Keyword → Most Frequently Paired Articles</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-zinc-800">
                  <th className="p-2">Keyword</th>
                  <th className="p-2">Top Articles</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(keywordToArticles).sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0)).slice(0,20).map(([k, arts]) => (
                  <tr key={k}>
                    <td className="p-2 font-semibold">{k}</td>
                    <td className="p-2">
                      {Object.entries(arts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([a, v]) => (
                        <span key={a} className="inline-block bg-zinc-700 rounded px-2 py-1 mr-1 mb-1">{a}: {v}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
