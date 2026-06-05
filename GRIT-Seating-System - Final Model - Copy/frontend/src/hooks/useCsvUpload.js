import { useCallback, useEffect, useState } from 'react'
import Papa from 'papaparse'
import { CSV_COLUMNS } from '../utils/constants'
import { computeSummary, normalizeRows, validateStudentRows } from '../utils/csvValidation'
import { loadStudentData, saveStudentData, clearStudentData } from '../utils/studentStorage'

export function useCsvUpload() {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState(null)
  const [errors, setErrors] = useState([])
  const [warnings, setWarnings] = useState([])
  const [summary, setSummary] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [emptyValueRows, setEmptyValueRows] = useState([])
  const [duplicateIds, setDuplicateIds] = useState([])

  const applyValidation = useCallback((parsedRows) => {
    const validation = validateStudentRows(parsedRows)
    setErrors(validation.errors)
    setWarnings(validation.warnings)
    setEmptyValueRows(validation.emptyValueRows)
    setDuplicateIds(validation.duplicateIds)
    setSummary(computeSummary(parsedRows))
    return validation
  }, [])

  const persistData = useCallback((parsedRows, name, validationErrors, validationWarnings) => {
    if (validationErrors.length > 0) return
    saveStudentData({
      fileName: name,
      rows: parsedRows,
      summary: computeSummary(parsedRows),
      warnings: validationWarnings,
    })
  }, [])

  const processParseResult = useCallback(
    (result, name) => {
      setIsParsing(false)

      if (result.errors?.length > 0) {
        setErrors([result.errors[0].message || 'Failed to parse CSV file.'])
        setWarnings([])
        setRows([])
        setSummary(null)
        return
      }

      const headers = result.meta?.fields ?? []
      if (!headers.length) {
        setErrors(['CSV file has no header row.'])
        setRows([])
        setSummary(null)
        return
      }

      const { rows: normalized, missingColumns, errors: colErrors } = normalizeRows(
        result.data,
        headers,
      )

      if (colErrors.length > 0) {
        setErrors(colErrors)
        setWarnings([])
        setRows([])
        setSummary(null)
        setFileName(name)
        return
      }

      if (missingColumns.length > 0) {
        setErrors([`Missing required column(s): ${missingColumns.join(', ')}`])
        setWarnings([])
        setRows([])
        setSummary(null)
        setFileName(name)
        return
      }

      setRows(normalized)
      setFileName(name)
      const validation = applyValidation(normalized)
      const allErrors = [...colErrors, ...validation.errors]
      setErrors(allErrors)
      persistData(normalized, name, allErrors, validation.warnings)
    },
    [applyValidation, persistData],
  )

  const parseFile = useCallback(
    (file) => {
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setErrors(['Please upload a .csv file.'])
        return
      }

      setIsParsing(true)
      setErrors([])
      setWarnings([])

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (result) => processParseResult(result, file.name),
        error: (err) => {
          setIsParsing(false)
          setErrors([err.message || 'Failed to read CSV file.'])
        },
      })
    },
    [processParseResult],
  )

  useEffect(() => {
    const saved = loadStudentData()
    if (saved?.rows?.length) {
      setRows(saved.rows)
      setFileName(saved.fileName ?? 'Previously uploaded')
      applyValidation(saved.rows)
      if (saved.warnings?.length) setWarnings(saved.warnings)
    }
  }, [applyValidation])

  const clearUpload = useCallback(() => {
    clearStudentData()
    setRows([])
    setFileName(null)
    setErrors([])
    setWarnings([])
    setSummary(null)
    setEmptyValueRows([])
    setDuplicateIds([])
    setIsDragging(false)
    setIsParsing(false)
  }, [])

  const hasBlockingErrors = errors.length > 0
  const canProceed = rows.length > 0 && !hasBlockingErrors
  const hasUpload = rows.length > 0 || Boolean(fileName)

  return {
    rows,
    fileName,
    errors,
    warnings,
    summary,
    isDragging,
    setIsDragging,
    isParsing,
    emptyValueRows,
    duplicateIds,
    parseFile,
    clearUpload,
    hasUpload,
    hasBlockingErrors,
    canProceed,
    columns: CSV_COLUMNS,
  }
}
