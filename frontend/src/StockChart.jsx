import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

function StockChart({ candles }) {
  const chartContainer = useRef(null);

  useEffect(() => {
    if (!chartContainer.current || !candles?.length) return;

    const chart = createChart(chartContainer.current, {
      width: chartContainer.current.clientWidth,
      height: 360,
      layout: {
        background: { color: "#172033" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#26344f" },
        horzLines: { color: "#26344f" },
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
      timeScale: {
        borderColor: "#334155",
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    series.setData(candles);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainer.current) {
        chart.applyOptions({
          width: chartContainer.current.clientWidth,
        });
      }
    });

    resizeObserver.observe(chartContainer.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles]);

  return <div ref={chartContainer} className="stock-chart" />;
}

export default StockChart;