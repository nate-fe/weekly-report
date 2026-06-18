import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllWeeklyTasks, fetchMembers } from '../utils/storage'
import { useTeamSettings } from '../context/TeamSettingsContext'
import {
  buildAssigneeOptions,
  filterWeeklyTasks,
  matchingWorksInPeriod,
} from '../utils/workSearch'
import { normalizeTaskNameFields } from '../utils/nateServices'
import { fmtRangeShort, workSummary } from '../utils/weeklyTask'
import DateRangePicker from '../components/DateRangePicker'

const EMPTY_FILTERS = {
  service: '',
  memberId: '',
  periodFrom: '',
  periodTo: '',
}

export default function WorkSearch() {
  const { settings } = useTeamSettings()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [toast, setToast] = useState('')

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    Promise.all([fetchAllWeeklyTasks(), fetchMembers()])
      .then(([taskRows, memberRows]) => {
        setTasks(taskRows)
        setMembers(memberRows)
      })
      .catch(e => showToast('데이터 로드 실패: ' + e.message, true))
      .finally(() => setLoading(false))
  }, [])

  const assigneeOptions = useMemo(
    () => buildAssigneeOptions(members, tasks),
    [members, tasks],
  )

  const results = useMemo(
    () => filterWeeklyTasks(tasks, filters),
    [tasks, filters],
  )

  const hasFilters = filters.service || filters.memberId || filters.periodFrom || filters.periodTo

  const resetFilters = () => setFilters(EMPTY_FILTERS)

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>업무 검색을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="work-search-page">
      <div className="work-search-header">
        <h2 className="work-search-title">업무 검색</h2>
        <p className="work-search-desc">
          저장된 주간 업무에서 서비스·담당자·작업 기간으로 검색합니다.
        </p>
      </div>

      <section className="work-search-filters settings-card">
        <h3 className="settings-card-title">검색 조건</h3>
        <div className="work-search-fields">
          <label className="work-search-field">
            <span className="field-label">서비스</span>
            <select
              className="work-search-control settings-select"
              value={filters.service}
              onChange={e => setFilters(f => ({ ...f, service: e.target.value }))}
            >
              <option value="">전체</option>
              {settings.services.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="work-search-field">
            <span className="field-label">담당자</span>
            <select
              className="work-search-control settings-select"
              value={filters.memberId}
              onChange={e => setFilters(f => ({ ...f, memberId: e.target.value }))}
            >
              <option value="">전체</option>
              {assigneeOptions.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.deleted ? ' (삭제됨)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="work-search-field">
            <span className="field-label">기간</span>
            <DateRangePicker
              from={filters.periodFrom}
              to={filters.periodTo}
              onChange={({ from, to }) => setFilters(f => ({
                ...f,
                periodFrom: from,
                periodTo: to,
              }))}
              placeholder="작업 기간 선택"
            />
          </label>
        </div>

        <div className="work-search-toolbar-foot">
          <p className="work-search-count">
            {hasFilters
              ? `검색 결과 ${results.length}건`
              : `전체 ${tasks.length}건 · 조건을 선택하면 결과가 좁혀집니다`}
          </p>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={resetFilters}
            disabled={!hasFilters}
          >
            필터 초기화
          </button>
        </div>
      </section>

      <section className="work-search-results">
        {results.length === 0 ? (
          <p className="work-search-empty">
            {hasFilters ? '조건에 맞는 업무가 없습니다.' : '저장된 업무가 없습니다.'}
          </p>
        ) : (
          <ul className="work-search-list">
            {results.map(task => {
              const fields = normalizeTaskNameFields(task)
              const member = assigneeOptions.find(m => m.id === task.memberId)
              const assigneeName = member?.name || task.assignee?.trim() || '(담당자 없음)'
              const visibleWorks = matchingWorksInPeriod(
                task,
                filters.periodFrom,
                filters.periodTo,
              )
              const worksToShow = visibleWorks.length ? visibleWorks : (task.works || [])

              return (
                <li key={`${task.weekKey}-${task.id}`} className="work-search-item">
                  <div className="work-search-item-head">
                    <div className="work-search-item-title">
                      {fields.platforms.map(p => (
                        <span
                          key={p}
                          className={`task-platform-badge ${p === 'PC' ? 'pc' : 'mobile'}`}
                        >
                          {p}
                        </span>
                      ))}
                      {fields.service && (
                        <span className="work-search-service">{fields.service}</span>
                      )}
                      {fields.nameDetail && (
                        <span className="work-search-detail">{fields.nameDetail}</span>
                      )}
                    </div>
                    <Link
                      to="/weekly"
                      className="work-search-week-link"
                      title="주간 업무에서 보기"
                    >
                      {task.weekKey}
                    </Link>
                  </div>

                  <div className="work-search-item-meta">
                    <span className="work-search-assignee">
                      <span
                        className="member-tab-dot"
                        style={{ background: member?.color || '#ccc' }}
                      />
                      {assigneeName}
                    </span>
                  </div>

                  {worksToShow.length > 0 && (
                    <ul className="work-search-works">
                      {worksToShow.map(work => {
                        const summary = workSummary(work)
                        return (
                          <li key={work.id} className="work-search-work">
                            {summary.meta && (
                              <span className="work-search-work-meta">{summary.meta}</span>
                            )}
                            {summary.content && (
                              <span className="work-search-work-content">{summary.content}</span>
                            )}
                            {(work.from || work.to) && (
                              <span className="work-search-work-period">
                                {fmtRangeShort(work.from, work.to)}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {toast && (
        <div className={`toast show ${toast.err ? 'toast-error' : ''}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
