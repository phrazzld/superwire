"use client";

import React, { useState, useMemo } from "react";

interface CalendarViewProps {
  availableDates: string[]; // Array of ISO date strings (YYYY-MM-DD)
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export default function CalendarView({
  availableDates,
  selectedDate,
  onDateSelect,
  className = "",
  minDate,
  maxDate
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });

  // Create a Set for O(1) lookup of available dates
  const availableDatesSet = useMemo(() => {
    return new Set(availableDates.map(date => date.split('T')[0]));
  }, [availableDates]);

  // Get calendar grid data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    const today = new Date().toISOString().split('T')[0];
    if (availableDatesSet.has(today) && onDateSelect) {
      onDateSelect(today);
    }
  };

  // Format helpers
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
  };

  const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    const dateStr = formatDateString(date);
    return dateStr === selectedDate.split('T')[0];
  };

  const isAvailable = (date: Date): boolean => {
    const dateStr = formatDateString(date);
    return availableDatesSet.has(dateStr);
  };

  const isDisabled = (date: Date): boolean => {
    const dateStr = formatDateString(date);
    
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (isDisabled(date)) return;
    
    const dateStr = formatDateString(date);
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {formatMonthYear(currentMonth)}
          </h2>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Today
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((date, index) => {
          const available = isAvailable(date);
          const selected = isSelected(date);
          const today = isToday(date);
          const inCurrentMonth = isCurrentMonth(date);
          const disabled = isDisabled(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                relative aspect-square flex items-center justify-center rounded-lg text-sm
                transition-all duration-150
                ${!inCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                ${available && !selected ? 'font-semibold' : ''}
                ${selected ? 'bg-blue-500 text-white font-bold' : ''}
                ${!selected && available && !disabled ? 'hover:bg-blue-50' : ''}
                ${!selected && !available && !disabled ? 'hover:bg-gray-50' : ''}
                ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                ${today && !selected ? 'ring-2 ring-blue-400 ring-inset' : ''}
              `}
            >
              <span>{date.getDate()}</span>
              {available && !selected && (
                <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-white border-2 border-blue-400 rounded-sm"></span>
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative w-3 h-3">
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
          </div>
          <span className="text-gray-600">Has Content</span>
        </div>
      </div>
    </div>
  );
}

// Utility component for month/year picker
export function MonthYearPicker({
  currentDate,
  onDateChange,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 1
}: {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  const handleMonthChange = (monthIndex: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    onDateChange(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    onDateChange(newDate);
  };

  return (
    <div className="flex space-x-2">
      <select
        value={currentDate.getMonth()}
        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {months.map((month, index) => (
          <option key={month} value={index}>
            {month}
          </option>
        ))}
      </select>
      
      <select
        value={currentDate.getFullYear()}
        onChange={(e) => handleYearChange(parseInt(e.target.value))}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {years.map(year => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

// Compact calendar for sidebar or smaller spaces
export function CompactCalendar({
  availableDates,
  selectedDate,
  onDateSelect,
  className = ""
}: Omit<CalendarViewProps, 'minDate' | 'maxDate'>) {
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  const recentDates = useMemo(() => {
    // Show last 7 days with content
    return availableDates
      .map(date => date.split('T')[0])
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 7);
  }, [availableDates]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (showFullCalendar) {
    return (
      <div className={className}>
        <button
          onClick={() => setShowFullCalendar(false)}
          className="mb-2 text-sm text-blue-600 hover:text-blue-700"
        >
          ← Show recent dates
        </button>
        <CalendarView
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
        />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Browse by Date</h3>
        <button
          onClick={() => setShowFullCalendar(true)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Show calendar
        </button>
      </div>
      
      <div className="space-y-1">
        {recentDates.map(dateStr => (
          <button
            key={dateStr}
            onClick={() => onDateSelect?.(dateStr)}
            className={`
              w-full text-left px-3 py-2 rounded-md text-sm transition-colors
              ${selectedDate?.startsWith(dateStr) 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'hover:bg-gray-50 text-gray-700'}
            `}
          >
            {formatDate(dateStr)}
          </button>
        ))}
      </div>
      
      {availableDates.length > 7 && (
        <button
          onClick={() => setShowFullCalendar(true)}
          className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700 text-center"
        >
          View all {availableDates.length} dates →
        </button>
      )}
    </div>
  );
}