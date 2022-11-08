<template>
  <div class="alida" v-on:click="showPopup(null, $event)">
    <section class="graphics">
      <!-- <img class="logo" id="logo-atm" :src="`${require('@/assets/amsterdam-time-machine.svg')}`" /> -->
      <img id="logo-alida" :src="`${require('@/assets/ga.png')}`" />

      <div class="header">
        <p>
          Based on <a href="https://alida.amsterdamtimemachine.nl">https://alida.amsterdamtimemachine.nl</a>
        </p>
      </div>
      <svg class="graph" :width="`${graph.width}px`"
        :viewBox="graph.viewBox && graph.viewBox.join(' ')"
        xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g :transform="graph.transform">
          <g v-for="(node) in graph.nodes"
            v-bind:class="{
              node: true,
              selected: popup && node.index === popup.datasetIndex,
              faded: !intersect(checkedTags, datasets[node.index].tags)
            }"
            v-on:click="showPopup(node.index, $event)" :key="node.name">
            <g class="edge-blobs">
              <path v-for="(path, index) in node.edges.in" :d="path" :key="`in${index}`" class="edge-blob-in" />
              <path v-for="(path, index) in node.edges.out" :d="path" :key="`out${index}`" class="edge-blob-out" />
            </g>
            <title>{{ node.name }}</title>

            <ellipse v-for="color in colors" class="colored-ellipse" :key="color"
              :style="`fill: ${color};`"
              :cx="node.cx" :cy="node.cy" :rx="node.rx" :ry="node.ry" />

            <ellipse :cx="node.cx" :cy="node.cy" :rx="node.rx" :ry="node.ry" />

            <text :x="node.cx" :y="node.cy + 4">
              {{ node.name }}
            </text>
          </g>
          <g v-for="edge in graph.edges" class="edge" :key="edge.edge.join('-')">
            <path v-for="(path, index) in edge.paths" :d="path" :key="`path${index}`" />
            <polygon v-for="(polygon, index) in edge.polygons" :points="polygon" :key="`polygon${index}`" />
          </g>
        </g>
      </svg>
    </section>
    <div>
      <Popup v-if="popup"
        :dataset="datasets[popup.datasetIndex]"
        :location="popup.location" :width="popup.width" />
    </div>
    <section>
      <fieldset>
        <span class="legend">Filter by tag:</span>
        <ul class="tags">
          <li v-for="tag in tags" :key="tag">
            <input  type="checkbox" :id="`tags-${tag}`"
              name="tags" :value="tag" v-model="checkedTags">
            <label :for="`tags-${tag}`" class="tag">{{ tag }}</label>
          </li>
        </ul>
      </fieldset>
    </section>
    <section class="text">
      <div>
        <h2>Golden Agents</h2>
        <p>
          The Golden Agents project combines datasets on cultural production and consumption in Amsterdam in the 17th and 18th century. 
          This overview shows some of these datasets and how they are connected. For more information, see the project website: <a href="https://www.goldenagents.org">https://www.goldenagents.org</a>.
        </p>
        </div>
      <div>
        <h2>About the data</h2>
        <p>
          More information on the datasets is available at <a href="https://data.goldenagents.org/">https://data.goldenagents.org/</a>.
        </p>
      </div>
    </section>
    <footer>
      <img :src="require('@/assets/lines-straight.svg')" />
    </footer>
  </div>
</template>

<script>
import Popup from './Popup.vue'
import axios from 'axios'
import {render, Module} from 'viz.js/lite.render.js'

const VIZ_DEFAULTS = {
  files: [],
  format: 'svg',
  engine: 'dot'
}

function getPopupStyle (width, diffX) {
  const left = Math.round((width / 2 + diffX) / width * 100)
  return `
    .popup:after,
    .popup:before {
      left: ${left}% !important;
  }`
}

function dotGraphFromDatasets (datasets) {
  return `strict digraph {
    #concentrate=true;
    node [fontname="monospace" margin=0.06];

  ${datasets.map((dataset) => dataset
    .outgoinglinks
    .map((link) =>
      `"${dataset.name}" -> "${link}";`
     ).join('\n')).join('\n')}
  }`
}

function renderDatasetGraph (datasets) {
  const options = Object.assign({}, VIZ_DEFAULTS)
  const module = Module(options)

  const dot = dotGraphFromDatasets(datasets)
  const svg = render(module, dot, options)

  return svg
}

function stringToDOM (string) {
  const parser = new DOMParser()
  return parser.parseFromString(string, 'text/xml')
}

function getPopupLocation (element) {
  const rect = element.getBoundingClientRect()

  return {
    x: window.scrollX + rect.left + rect.width / 2,
    y: window.scrollY + (rect.top + rect.bottom) / 2 + rect.height / 2 + 12
  }
}

export default {
  name: 'ALiDa',
  components: {
    Popup
  },
  props: {
    dataUrl: String
  },
  data () {
    return {
      datasets: undefined,
      popup: undefined,
      popupStyle: undefined,
      tags: [],
      checkedTags: [],
      svg: '',
      graph: {
        nodes: [],
        edges: [],
        viewBox: undefined,
        width: 0,
        height: 0
      },
      colors: [
        '#efc501',
        '#323232',
        '#075446'
      ]
    }
  },
  methods: {
    intersect: function (a, b) {
      let intersection = new Set(
        [...a].filter((tag) => new Set(b).has(tag))
      )

      return intersection.size > 0
    },
    showPopup: function (index, event) {
      if (index === null || (this.popup && this.popup.datasetIndex === index)) {
        this.popup = undefined
        event.stopPropagation()
      } else if (index >= 0) {
        const location = getPopupLocation(event.target)

        const width = Math.min(300, document.body.clientWidth)
        // console.log(width, document.body.clientWidth)


        location.x -= Math.round(width / 2)

        var padding = 10
        var minX = padding
        var maxX = document.body.clientWidth - padding - width
        var diffX = 0

        if (location.x < minX) {
          diffX = location.x - minX
          location.x = minX
        } else if (location.x > maxX) {
          diffX = location.x - maxX
          location.x = maxX
        }

        if (!this.popupStyle) {
          this.popupStyle = document.createElement('style')
          document.head.appendChild(this.popupStyle)
        }

        this.popupStyle.innerHTML = getPopupStyle(width, diffX)

        this.popup = {
          datasetIndex: index,
          location,
          width
        }

        event.stopPropagation()
      }
    }
  },
  mounted () {
    axios
      .get(this.dataUrl)
      .then((response) => {
        this.datasets = response.data

        const tags = [...this.datasets
          .reduce((tags, dataset) =>
            new Set([...tags, ...dataset.tags]),
            new Set()
          )]

        this.tags = tags
        this.checkedTags = [...tags]

        return this.datasets
      })
      .then((datasets) => {
        const svgPadding = 10

        const svgString = renderDatasetGraph(datasets)
        const dom = stringToDOM(svgString)

        const svg = dom.querySelector('svg')
        const graph = dom.querySelector('.graph')

        const width = parseInt(svg.getAttribute('width')) + svgPadding * 2
        const height = parseInt(svg.getAttribute('height')) + svgPadding * 2

        const viewBox = svg.getAttribute('viewBox')
          .split(' ')
          .map((n) => Math.round(parseInt(n)))
          .map((n, i) => n + (i < 2 ? -svgPadding : svgPadding * 2))

        const transform = graph.getAttribute('transform')

        const domEdges = dom.querySelectorAll('.edge')
        const domNodes = dom.querySelectorAll('.node')

        const outEdgesPerNode = {}
        const inEdgesPerNode = {}

        const edges = Array.from(domEdges)
          .map((edge) => {
            // TODO: '->' or '-&gt;'
            const fromTo = edge.querySelector('title').innerHTML.split('-&gt;')

            const paths = edge.querySelectorAll('path')
            const polygons = edge.querySelectorAll('polygon')

            const ds = Array.from(paths).map((path) => path.getAttribute('d'))

            outEdgesPerNode[fromTo[0]] = outEdgesPerNode[fromTo[0]] ? [ds, ...outEdgesPerNode[fromTo[0]]] : [ds]
            inEdgesPerNode[fromTo[1]] = inEdgesPerNode[fromTo[1]] ? [ds, ...inEdgesPerNode[fromTo[1]]] : [ds]

            return {
              edge: fromTo,
              paths: ds,
              polygons: Array.from(polygons).map((polygon) => polygon.getAttribute('points'))
            }
          })

        const nodes = Array.from(domNodes)
          .map((node) => {
            const name = node.querySelector('title').innerHTML
            const ellipse = node.querySelector('ellipse')

            let index = 0
            this.datasets.some((dataset, currentIndex) => {
              index = currentIndex
              return dataset.name === name
            })

            return {
              index,
              name,
              cx: parseFloat(ellipse.getAttribute('cx')),
              cy: parseFloat(ellipse.getAttribute('cy')),
              rx: parseFloat(ellipse.getAttribute('rx')),
              ry: parseFloat(ellipse.getAttribute('ry')),
              edges: {
                in: inEdgesPerNode[name],
                out: outEdgesPerNode[name]
              }
            }
          })

        this.graph = {
          width,
          height,
          viewBox,
          transform,
          nodes,
          edges
        }
      })
  }
}
</script>

<style scoped>
.alida {
  margin: 0.5em;
}

.graphics {
  width: 2500px;
  max-width: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.graphics .logo {
  width: 200px;
}

.graphics .graph {
  width: 2500px;
  max-width: 100%;
}

#logo-alida {
  isolation: isolate;
}

.st0{fill:#5CBD70;}
.st1{fill:#0099CD;}
.st2{fill:#EE275F;}
.st3{fill:#FFFFFF; stroke-width: 3px; stroke:#231F20;stroke-linecap:round;stroke-linejoin:round;}

.st0, .st1, .st2 {
  mix-blend-mode: screen;
}

@media only screen and (max-width: 600px) {
  .graphics img {
    width: 150px;
  }
}

@media only screen and (max-width: 400px) {
  .graphics img {
    width: 100px;
  }
}

header img:first-child {
  float: left;
}

header img:last-child {
  float: right;
}

footer, section {
  font-size: 16px;
  width: 1200px;
  max-width: 100%;
  margin: 1em auto;
}

.graph {
  width: 100%;
  margin: 1em 0;
}

fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

footer img {
  width: 100%;
}

.node {
  isolation: isolate;
  cursor: pointer;
  transition: opacity 0.2s;
}

.node ellipse {
  fill: white;
  stroke: black;
  stroke-width: 1px;
  transition: fill 0.2s, stroke-width 0.2s;
  mix-blend-mode: screen;
}

.node .colored-ellipse {
  mix-blend-mode: screen;
}

.node:hover ellipse,
.node.selected ellipse {
  fill: rgba(255, 255, 255, 0);
}

.node .colored-ellipse {
  stroke: none;
  transition: transform 0.2s;
}

.node.selected .colored-ellipse:nth-of-type(1),
.node:hover .colored-ellipse:nth-of-type(1) {
  transform: translate(6px, 3px);
}

.node.selected .colored-ellipse:nth-of-type(2),
.node:hover .colored-ellipse:nth-of-type(2) {
  transform: translate(-6px, 2px);
}

.node.selected .colored-ellipse:nth-of-type(3),
.node:hover .colored-ellipse:nth-of-type(3) {
  transform: translate(5px, -6px);
}

.node.faded {
  opacity: 0.2;
}

.node text {
  fill: black;
  text-anchor: middle;
  font-size: 12px;
  font-weight: 500;
}

.edge path {
  fill: none;
  stroke: black;
  stroke-width: 1px;
  mix-blend-mode: darken;
}

.edge polygon {
  fill: black;
  stroke: black;
}

.node .edge-blobs path {
  fill: none;
  mix-blend-mode: darken;
  stroke-width: 0;
  transition: stroke-width 0.3s;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.node .edge-blobs .edge-blob-in,
.node .edge-blobs .edge-blob-out {
  stroke: black;
}

.node.selected .edge-blobs path {
  stroke-width: 2px;
}

.node:hover .edge-blobs path {
  stroke-width: 2px;
}

.header {
  text-align: center;
}

.text {
  columns: 2;
}

.text > *,
.text > * p {
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  break-inside: avoid;
}

.text h2:first-child {
  margin-top: 0;
}

@media only screen and (max-width: 600px) {
  .text {
    columns: 1;
  }
}
</style>
