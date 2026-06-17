import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

function Notifications() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    
    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications'),
      orderBy('timestamp', 'desc')
    )
    
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setNotifications(notifs)
      setLoading(false)
    }, err => {
      console.error("Error fetching notifications:", err)
      setLoading(false)
    })
    
    return unsub
  }, [currentUser])

  const markAsRead = async (id, currentReadStatus) => {
    if (currentReadStatus) return // already read
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', id), {
        read: true
      })
    } catch (err) {
      console.error("Failed to mark as read", err)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read)
    if (unread.length === 0) return
    
    try {
      const batch = writeBatch(db)
      unread.forEach(n => {
        const ref = doc(db, 'users', currentUser.uid, 'notifications', n.id)
        batch.update(ref, { read: true })
      })
      await batch.commit()
    } catch (err) {
      console.error("Failed to mark all as read", err)
    }
  }

  const clearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) return
    
    try {
      // For a small number of docs, batch delete is fine.
      // Alternatively, we could delete one by one.
      const batch = writeBatch(db)
      const snap = await getDocs(collection(db, 'users', currentUser.uid, 'notifications'))
      snap.forEach(d => {
        batch.delete(d.ref)
      })
      await batch.commit()
    } catch (err) {
      console.error("Failed to clear notifications", err)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString()
  }

  // Type-based styles
  const getBadgeColor = (type) => {
    switch(type) {
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'success': return 'bg-green-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2>Notifications</h2>
        <ThemeToggle />
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={markAllAsRead} disabled={notifications.every(n => n.read)}>
          Mark all as read
        </button>
        <button className="btn btn-ghost btn-sm" onClick={clearAll} disabled={notifications.length === 0} style={{ color: 'var(--color-danger)' }}>
          Clear all
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="spinner" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-8 text-muted">
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔕</p>
          <p>You have no notifications.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className="card-sm"
              onClick={() => markAsRead(notif.id, notif.read)}
              style={{ 
                cursor: notif.read ? 'default' : 'pointer',
                opacity: notif.read ? 0.7 : 1,
                borderLeft: notif.read ? '3px solid transparent' : '3px solid var(--color-primary)',
                transition: 'all 0.2s ease',
                padding: '1rem'
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!notif.read && <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} className={getBadgeColor(notif.type)}></span>}
                  {notif.title}
                </h4>
                <span className="text-xs text-muted whitespace-nowrap ml-2">
                  {formatDate(notif.timestamp)}
                </span>
              </div>
              <p className="text-sm text-muted">{notif.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
