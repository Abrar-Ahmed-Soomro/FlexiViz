'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import Link from 'next/link';
import { ChartErrorBoundary } from '@/components/ChartErrorBoundary';

interface DatasetInfo {
  _id: string;
  fileName: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    distinctCount: number;
    distinctValues: unknown[];
    nullCount: number;
    min?: unknown;
    max?: unknown;
    mean?: number;
  }>;
}

type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'scatter' | 'area' | 'stacked';
type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

interface Filter {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: string;
  value2: string;
}

interface ChartResult {
  label: string;
  legend?: string;
  value: number;
}

interface SeriesData {
  name: string;
  data: number[];
}

interface ChartDataPayload {
  categories?: string[];
  values?: number[];
  series?: SeriesData[];
  points?: [number, number][];
}

export default function PublicDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [labelColumn, setLabelColumn] = useState('');
  const [legendColumn, setLegendColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [aggregation, setAggregation] = useState<Aggregation>('sum');
  const [filters, setFilters] = useState<Filter[]>([]);

  const [chartData, setChartData] = useState<ChartDataPayload | null>(null);
  const [rawData, setRawData] = useState<ChartResult[]>([]);

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const res = await fetch(`/api/public/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setDataset(data.dataset);
        } else {
          setError('Dataset not found or not publicly accessible');
        }
      } catch {
        setError('Failed to load dataset');
      } finally {
        setLoading(false);
      }
    };

    fetchDataset();
  }, [slug]);

  const handleBuildChart = useCallback(async () => {
    if (!labelColumn || !valueColumn || !dataset) {
      setError('Please select label and value columns');
      return;
    }

    setBuilding(true);
    setError('');
    try {
      const res = await fetch(`/api/chart/build/${dataset._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType,
          labelColumn,
          legendColumn: legendColumn || undefined,
          valueColumn,
          aggregation,
          filters: filters.filter(f => f.column && f.value !== ''),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to build chart');
      }

      const result = await res.json();
      setChartData(result.chartData);
      setRawData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build chart');
    } finally {
      setBuilding(false);
    }
  }, [chartType, labelColumn, legendColumn, valueColumn, aggregation, filters, dataset]);

  useEffect(() => {
    if (!labelColumn || !valueColumn || !dataset) return;

    const timer = setTimeout(() => {
      handleBuildChart();
    }, 500);

    return () => clearTimeout(timer);
  }, [chartType, labelColumn, legendColumn, valueColumn, aggregation, filters, dataset, handleBuildChart]);

  const addFilter = () => {
    setFilters([...filters, { id: Date.now().toString(), column: '', operator: 'equals', value: '', value2: '' }]);
  };

  const updateFilter = (id: string, field: keyof Filter, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const getEChartsOption = (): EChartsOption => {
    if (!chartData) return {};

    const baseOption: EChartsOption = {
      tooltip: {
        trigger: chartType === 'pie' || chartType === 'donut' ? 'item' : 'axis',
      },
      legend: {
        show: !!legendColumn && (chartData.series?.length ?? 0) > 1 && chartType !== 'scatter',
        data: chartData.series?.map((s: SeriesData) => s.name) || [],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis:
        chartType === 'pie' || chartType === 'donut'
          ? undefined
          : chartType === 'scatter'
            ? { type: 'value', scale: true }
            : { type: 'category', data: chartData.categories || [] },
      yAxis:
        chartType === 'pie' || chartType === 'donut'
          ? undefined
          : { type: 'value' },
      series: [] as EChartsOption['series'],
    };

    if (chartType === 'pie' || chartType === 'donut') {
      baseOption.series = [
        {
          type: 'pie',
          radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
          data: chartData.categories?.map((cat: string, idx: number) => ({
            name: cat,
            value: chartData.values?.[idx],
          })) || [],
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold',
            },
          },
        },
      ];
    } else if (chartType === 'scatter') {
      baseOption.series = chartData.series?.map((s: SeriesData) => ({
        name: s.name,
        type: 'scatter',
        data: s.data,
        symbolSize: 8,
      })) || [];
    } else if (chartData.series && chartData.series.length > 0) {
      baseOption.series = chartData.series.map((s: SeriesData) => ({
        name: s.name,
        type: chartType === 'stacked' ? 'bar' : (chartType === 'area' ? 'line' : chartType),
        stack: chartType === 'stacked' ? 'total' : undefined,
        areaStyle: chartType === 'area' ? {} : undefined,
        data: s.data,
        smooth: true,
      }));
    } else {
      baseOption.series = [
        {
          type: chartType === 'stacked' ? 'bar' : (chartType === 'area' ? 'line' : chartType),
          stack: chartType === 'stacked' ? 'total' : undefined,
          areaStyle: chartType === 'area' ? {} : undefined,
          data: (chartData.values || []) as number[],
          smooth: true,
        },
      ];
    }

    return baseOption;
  };

  const exportChart = () => {
    const chartInstance = (document.querySelector('.echarts-for-react') as { getEchartsInstance?: () => unknown } | null)?.getEchartsInstance?.();
    if (chartInstance) {
      const url = (chartInstance as { getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string }).getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataset?.fileName || 'chart'}.png`;
      link.click();
    }
  };

  const exportCSV = () => {
    if (rawData.length === 0) return;
    const headers = Object.keys(rawData[0]);
    const csv = [
      headers.join(','),
      ...rawData.map(row => headers.map(h => `"${row[h as keyof ChartResult]}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataset?.fileName || 'data'}_export.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center py-12">
          <p className="text-slate-500">{error || 'Dataset not found'}</p>
        </div>
      </div>
    );
  }

  const numericColumns = dataset.columns.filter(c => c.type === 'DOUBLE' || c.type === 'INTEGER' || c.type === 'BIGINT');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FV</span>
              </div>
              <span className="text-xl font-bold text-slate-900">FlexiViz</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Public Dashboard</h1>
            <p className="text-slate-600 mt-1">{dataset.fileName} &bull; {dataset.rowCount.toLocaleString()} rows</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="pie">Pie</option>
                    <option value="donut">Donut</option>
                    <option value="scatter">Scatter</option>
                    <option value="area">Area</option>
                    <option value="stacked">Stacked Bar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Label (X-Axis)</label>
                  <select
                    value={labelColumn}
                    onChange={(e) => setLabelColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="">Select column</option>
                    {dataset.columns.map(col => (
                      <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Legend (Series)</label>
                  <select
                    value={legendColumn}
                    onChange={(e) => setLegendColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {dataset.columns.map(col => (
                      <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value (Y-Axis)</label>
                  <select
                    value={valueColumn}
                    onChange={(e) => setValueColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="">Select column</option>
                    {numericColumns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aggregation</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as Aggregation)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="count">Count</option>
                    <option value="min">Min</option>
                    <option value="max">Max</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Filters</label>
                    <button
                      onClick={addFilter}
                      className="text-xs text-slate-900 hover:underline"
                    >
                      + Add Filter
                    </button>
                  </div>
                  {filters.map((filter) => (
                    <div key={filter.id} className="space-y-2 mb-3 p-3 bg-slate-50 rounded-md">
                      <select
                        value={filter.column}
                        onChange={(e) => updateFilter(filter.id, 'column', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="">Column</option>
                        {dataset.columns.map(col => (
                          <option key={col.name} value={col.name}>{col.name}</option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="between">Between</option>
                      </select>
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      {filter.operator === 'between' && (
                        <input
                          type="text"
                          value={filter.value2}
                          onChange={(e) => updateFilter(filter.id, 'value2', e.target.value)}
                          placeholder="Value 2"
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      )}
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleBuildChart}
                  disabled={building || !labelColumn || !valueColumn}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50"
                >
                  {building ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Building...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      Build Chart
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                {chartData ? (
                  <>
                    <div className="flex flex-wrap justify-end gap-2 mb-4">
                      <button
                        onClick={exportChart}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4" />
                        Export PNG
                      </button>
                      <button
                        onClick={exportCSV}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    </div>
                    {rawData.length > 0 ? (
                      <ChartErrorBoundary>
                        <ReactECharts
                          option={getEChartsOption()}
                          style={{ height: '500px', width: '100%' }}
                          opts={{ renderer: 'canvas' }}
                        />
                      </ChartErrorBoundary>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                        <BarChart3 className="w-16 h-16 mb-4" />
                        <p>No data available for the selected configuration</p>
                        <p className="text-sm mt-2">Try adjusting your filters or selecting different columns</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                    <BarChart3 className="w-16 h-16 mb-4" />
                    <p>Configure your chart and click &quot;Build Chart&quot;</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
