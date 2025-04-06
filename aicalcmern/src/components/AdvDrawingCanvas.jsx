'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Eraser, Circle, Square, Triangle, Pencil, Calculator, Undo, Redo, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function Component() {
  const canvasRef = useRef(null)
  const [context, setContext] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [color, setColor] = useState('#FFFFFF')
  const [tool, setTool] = useState('pencil')
  const [penSize, setPenSize] = useState(5)
  const [results, setResults] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [draggedResult, setDraggedResult] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 })
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        setContext(ctx)
      }
    }

    const handleResize = () => {
      if (canvas && context) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0)

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        context.fillStyle = '#1F2937'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(tempCanvas, 0, 0)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [context])

  useEffect(() => {
    if (context) {
      context.lineWidth = penSize
    }
  }, [context, penSize])

  const startDrawing = (e) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e
    setDrawing(true)
    setShapeStart({ x: clientX, y: clientY })

    const draggedResult = results.find(result =>
      clientX >= result.x &&
      clientX <= result.x + 200 &&
      clientY >= result.y &&
      clientY <= result.y + 40
    )
    if (draggedResult) {
      setIsDragging(true)
      setDraggedResult(draggedResult)
      setDragStart({ x: clientX - draggedResult.x, y: clientY - draggedResult.y })
    } else {
      context.beginPath()
      context.moveTo(clientX, clientY)
    }
  }

  const draw = (e) => {
    if (!drawing) return
    const { clientX, clientY } = e.touches ? e.touches[0] : e

    if (isDragging && draggedResult) {
      const newResults = results.map(r =>
        r === draggedResult ? { ...r, x: clientX - dragStart.x, y: clientY - dragStart.y } : r
      )
      setResults(newResults)
      return
    }

    context.strokeStyle = tool === 'eraser' ? '#1F2937' : color

    if (tool === 'pencil' || tool === 'eraser') {
      context.lineTo(clientX, clientY)
      context.stroke()
    } else {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvasRef.current.width
      tempCanvas.height = canvasRef.current.height
      const tempContext = tempCanvas.getContext('2d')
      tempContext.drawImage(canvasRef.current, 0, 0)

      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      context.drawImage(tempCanvas, 0, 0)

      context.beginPath()
      if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(clientX - shapeStart.x, 2) + Math.pow(clientY - shapeStart.y, 2))
        context.arc(shapeStart.x, shapeStart.y, radius, 0, 2 * Math.PI)
      } else if (tool === 'square') {
        const width = clientX - shapeStart.x
        const height = clientY - shapeStart.y
        context.rect(shapeStart.x, shapeStart.y, width, height)
      } else if (tool === 'triangle') {
        context.moveTo(shapeStart.x, shapeStart.y)
        context.lineTo(clientX, clientY)
        context.lineTo(shapeStart.x - (clientX - shapeStart.x), clientY)
        context.closePath()
      }
      context.stroke()
    }
  }

  const stopDrawing = () => {
    if (drawing) {
      setDrawing(false)
      setIsDragging(false)
      setDraggedResult(null)
      context.beginPath()
      saveToHistory()
    }
  }

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#1F2937'
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      setResults([])
      saveToHistory()
    }
  }

  // const calculateResult = async () => {
  //   const canvas = canvasRef.current;
  //   if (!canvas) return;

  //   const imageData = canvas.toDataURL('image/png');
  //   console.log(imageData);
  //   const base64Image = imageData.split(',')[1]; // Get only the base64 string

  //   try {
  //     setLoading(true);
  //     const response = await axios.post('http://localhost:3000/api/calculate', { image: base64Image }, {
  //       headers: { 'Content-Type': 'application/json' },
  //     });
  //     const jsonResponse = response.data.message.replace(/'/g, '"');
  //     const parsedResponse = JSON.parse(jsonResponse);

  //     const newResults = parsedResponse.map((item, index) => ({
  //       text: `${item.expr} => ${item.result}`,
  //       x: 50,
  //       y: 50 + index * 30, // Offset y for each item to avoid overlap
  //     }));

  //     setResults([...results, ...newResults]);
  //   } catch (error) {
  //     console.error('Error calculating result:', error);
  //     const errorResult = {
  //       text: 'Error calculating.',
  //       x: 50,
  //       y: 50,
  //     };
  //     setResults([...results, errorResult]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const calculateResult = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    console.log(imageData);
    const base64Image = imageData.split(',')[1]; // Get only the base64 string

    try {
      setLoading(true);
      const response = await axios.post('http://localhost:3000/api/calculate', { image: base64Image }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const jsonResponse = response.data.message.replace(/'/g, '"');

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(jsonResponse);
      } catch (parseError) {
        // If parsing fails, show the unparsed JSON data
        const cleanedStr = jsonResponse
          .replace(/[\[\]{}'""]/g, '')        
          .replace(/expr:\s*/g, '')           
          .replace(/,\s*result:\s*/g, ' => ');
        const unparsedResult = {
          text: `${cleanedStr}`,
          x: 50,
          y: 50,
        };
        setResults([...results, unparsedResult]);
        return; 
      }

      const newResults = parsedResponse.map((item, index) => ({
        text: `${item.expr} => ${item.result}`,
        x: 50,
        y: 50 + index * 40, // Offset y for each item to avoid overlap
      }));

      setResults([...results, ...newResults]);
    } catch (error) {
      console.error('Error calculating result:', error);
      const errorResult = {
        text: 'Error calculating!',
        x: 50,
        y: 50,
      };
      setResults([...results, errorResult]);
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(canvas.toDataURL())
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      loadFromHistory(historyIndex - 1)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      loadFromHistory(historyIndex + 1)
    }
  }

  const loadFromHistory = (index) => {
    const canvas = canvasRef.current
    if (!canvas || !context) return

    const img = new Image()
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(img, 0, 0)
    }
    img.src = history[index]
  }

  const startDragging = (e, result) => {
    setIsDragging(true)
    setDraggedResult(result)
    setDragStart({ x: e.clientX - result.x, y: e.clientY - result.y })
  }

  const stopDragging = () => {
    setIsDragging(false);
    setDraggedResult(null);
  };

  const drag = (e) => {
    if (!isDragging || !draggedResult) return
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setResults(results.map(r =>
      r === draggedResult ? { ...r, x: newX, y: newY } : r
    ))
  }


  return (
    <div
      className="h-screen bg-gray-900 text-gray-100 relative overflow-hidden"
      onMouseMove={(e) => {
        if (isDragging && draggedResult) {
          const newX = e.clientX - dragStart.x;
          const newY = e.clientY - dragStart.y;
          setResults(results.map(r =>
            r === draggedResult ? { ...r, x: newX, y: newY } : r
          ));
        }
      }}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
        className="w-full h-full absolute top-0 left-0"
      />
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
        {results.map((result, index) => (
          <div
            key={index}
            className="absolute bg-black bg-opacity-70 text-white p-2 rounded cursor-move pointer-events-auto select-none transition-all duration-150 ease-in-out result-container"
            style={{
              left: `${result.x}px`,
              top: `${result.y}px`,
              zIndex: 1000 + index
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDragging(true);
              setDraggedResult(result);
              setDragStart({ x: e.clientX - result.x, y: e.clientY - result.y });
            }}
          >
            {result.text}
            <button
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 transition-opacity duration-200 delete-button"
              onClick={(e) => {
                e.stopPropagation();
                setResults(results.filter(r => r !== result));
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-center gap-2 bg-gray-800 bg-opacity-80 p-4 rounded-lg">
        {['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1'].map((c) => (
          <Button
            key={c}
            onClick={() => { setColor(c); setTool('pencil'); }}
            className={`w-8 h-8 rounded-full border border-gray-600 ${color === c && tool === 'pencil' ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <Button
          onClick={() => setTool('eraser')}
          className={`flex items-center justify-center ${tool === 'eraser' ? 'bg-gray-600' : 'bg-gray-700'}`}
        >
          <Eraser className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setTool('circle')}
          className={`flex items-center justify-center ${tool === 'circle' ? 'bg-gray-600' : 'bg-gray-700'}`}
        >
          <Circle className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setTool('square')}
          className={`flex items-center justify-center ${tool === 'square' ? 'bg-gray-600' : 'bg-gray-700'}`}
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setTool('triangle')}
          className={`flex items-center justify-center ${tool === 'triangle' ? 'bg-gray-600' : 'bg-gray-700'}`}
        >
          <Triangle className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 bg-gray-700 px-2 rounded">
          <Pencil className="w-4 h-4" />
          <Slider
            value={[penSize]}
            onValueChange={(value) => setPenSize(value[0])}
            max={20}
            step={1}
            className="w-24"
          />
        </div>
        <Button onClick={undo} disabled={historyIndex <= 0} className="bg-gray-700 text-gray-100">
          <Undo className="w-4 h-4" />
        </Button>
        <Button onClick={redo} disabled={historyIndex >= history.length - 1} className="bg-gray-700 text-gray-100">
          <Redo className="w-4 h-4" />
        </Button>
        <Button onClick={clearCanvas} variant="outline" className="bg-gray-700 text-gray-100 border-gray-600">
          Clear
        </Button>
        {/* <Button onClick={calculateResult} className="flex items-center gap-2 bg-blue-600 text-gray-100 hover:bg-blue-700">
          <Calculator className="w-4 h-4" />
          Calculate
        </Button> */}

        {
          loading ? (
            <Button className="flex items-center gap-2 bg-gray-700 text-gray-100 hover:bg-gray-700">
              <Loader2 className=' h-4 w-4 animate-spin' />
              Calculating
            </Button>
          ) : (
            <Button onClick={calculateResult} className="flex items-center gap-2 bg-blue-600 text-gray-100 hover:bg-blue-700">
              <Calculator className="w-4 h-4" />
              Calculate
            </Button>
          )
        }
      </div>
      <style jsx>{`
        .result-container:hover .delete-button {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}