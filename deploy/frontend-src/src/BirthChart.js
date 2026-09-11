import React from "react";
import { motion } from "framer-motion";

const PLANET_SHORT = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  Rahu: "☊",
  Ketu: "☋",
};

const HOUSE_POLYGONS = {
  1: [[200,0],[100,100],[200,200],[300,100]],
  2: [[0,0],[200,0],[100,100]],
  3: [[0,0],[100,100],[0,200]],
  4: [[0,200],[100,100],[200,200],[100,300]],
  5: [[0,200],[100,300],[0,400]],
  6: [[0,400],[100,300],[200,400]],
  7: [[200,400],[100,300],[200,200],[300,300]],
  8: [[200,400],[300,300],[400,400]],
  9: [[400,400],[300,300],[400,200]],
  10:[[400,200],[300,300],[200,200],[300,100]],
  11:[[400,200],[300,100],[400,0]],
  12:[[400,0],[300,100],[200,0]],
};

const HOUSE_ANCHORS = {
  1:[200,65],
  2:[95,35],
  3:[35,100],
  4:[65,200],
  5:[35,300],
  6:[100,365],
  7:[200,335],
  8:[300,365],
  9:[365,300],
  10:[335,200],
  11:[365,100],
  12:[300,35],
};

function polyPoints(points){
  return points.map(p=>p.join(",")).join(" ");
}

function houseForDegree(degree,houses){

  const sorted=[...houses].sort((a,b)=>a.house-b.house);

  for(let i=0;i<sorted.length;i++){

    const cur=sorted[i].degree;
    const next=sorted[(i+1)%sorted.length].degree;

    if(next<cur){

      if(degree>=cur||degree<next)
        return sorted[i].house;

    }else{

      if(degree>=cur&&degree<next)
        return sorted[i].house;

    }

  }

  return null;

}

export default function BirthChart({chart}){

  if(!chart) return null;

  const grouped={};

  (chart.planets||[]).forEach(p=>{

    const house=houseForDegree(
      p.degree,
      chart.houses
    );

    if(!house) return;

    if(!grouped[house])
      grouped[house]=[];

    grouped[house].push(
      PLANET_SHORT[p.planet]||p.planet
    );

  });

  return(

    <motion.div
      className="birth-chart-wrapper"
      initial={{opacity:0,scale:.92}}
      animate={{opacity:1,scale:1}}
      transition={{duration:.6}}
    >

      <svg
        viewBox="0 0 400 400"
        className="birth-chart-svg"
      >

        <defs>

          <radialGradient id="goldGlow">
            <stop offset="0%" stopColor="#f5d06f"/>
            <stop offset="100%" stopColor="#cfa53d"/>
          </radialGradient>

        </defs>

        <rect
          x="0"
          y="0"
          width="400"
          height="400"
          rx="8"
          fill="transparent"
          stroke="rgba(255,255,255,.15)"
        />

        {Object.entries(HOUSE_POLYGONS).map(([n,pts])=>(

          <polygon
            key={n}
            points={polyPoints(pts)}
            fill="rgba(255,255,255,.02)"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="1.2"
          />

        ))}

        {Object.entries(HOUSE_ANCHORS).map(([house,[x,y]])=>(

          <g key={house}>

            <text
              x={x}
              y={y-14}
              textAnchor="middle"
              fill="#8f96b5"
              fontSize="11"
            >
              {house}
            </text>

            {(grouped[house]||[]).map((planet,index)=>(

              <text
                key={index}
                x={x}
                y={y+index*16}
                textAnchor="middle"
                fill="url(#goldGlow)"
                fontSize="14"
                fontWeight="700"
              >
                {planet}
              </text>

            ))}

          </g>

        ))}

      </svg>

    </motion.div>

  );

}