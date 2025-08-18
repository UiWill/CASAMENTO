// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBxvzIqZPXNZ4T7RVb9Y0mW6C3qJ8K4dF2",
    authDomain: "wedding-gifts-demo.firebaseapp.com",
    projectId: "wedding-gifts-demo",
    storageBucket: "wedding-gifts-demo.appspot.com",
    messagingSenderId: "987654321098",
    appId: "1:987654321098:web:fedcba0987654321abcdef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Sistema de Lista de Presentes - Casamento Cristiano & Luana
class GiftListManager {
    constructor() {
        this.gifts = [];
        this.currentFilter = 'all';
        this.db = db;
        this.initializeEventListeners();
        this.loadGiftsFromFirebase();
    }

    initializeEventListeners() {
        // Admin toggle
        document.getElementById('toggleAdmin').addEventListener('click', this.toggleAdminPanel);

        // Add gift form
        document.getElementById('addGift').addEventListener('click', this.addGift.bind(this));

        // Enter key on form inputs
        const formInputs = document.querySelectorAll('#adminForm input');
        formInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addGift();
                }
            });
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Modal events
        document.querySelector('.close').addEventListener('click', this.closeModal);
        document.getElementById('cancelReservation').addEventListener('click', this.closeModal);
        document.getElementById('confirmReservation').addEventListener('click', this.confirmReservation.bind(this));

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('reservationModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    toggleAdminPanel() {
        const adminForm = document.getElementById('adminForm');
        adminForm.classList.toggle('hidden');
        
        if (!adminForm.classList.contains('hidden')) {
            document.getElementById('giftName').focus();
        }
    }

    addGift() {
        const name = document.getElementById('giftName').value.trim();

        if (!name) {
            this.showAlert('Por favor, digite o nome do presente!', 'warning');
            document.getElementById('giftName').focus();
            return;
        }

        // Check if gift already exists
        if (this.gifts.some(gift => gift.name.toLowerCase() === name.toLowerCase())) {
            this.showAlert('Este presente já existe na lista!', 'warning');
            return;
        }

        const newGift = {
            name: name,
            reserved: false,
            reservedBy: '',
            reservedAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add to Firebase
        this.db.collection('gifts').add(newGift)
            .then((docRef) => {
                this.clearForm();
                this.showAlert('Presente adicionado com sucesso!', 'success');
            })
            .catch((error) => {
                console.error('Erro ao adicionar presente:', error);
                this.showAlert('Erro ao adicionar presente. Tente novamente.', 'error');
            });
    }

    clearForm() {
        document.getElementById('giftName').value = '';
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderGiftList();
    }

    renderGiftList() {
        const giftList = document.getElementById('giftList');
        const emptyMessage = document.getElementById('emptyMessage');
        
        let filteredGifts = this.gifts;
        
        // Apply filter
        if (this.currentFilter === 'available') {
            filteredGifts = this.gifts.filter(gift => !gift.reserved);
        } else if (this.currentFilter === 'reserved') {
            filteredGifts = this.gifts.filter(gift => gift.reserved);
        }

        if (filteredGifts.length === 0) {
            giftList.innerHTML = '';
            emptyMessage.style.display = 'block';
            
            if (this.gifts.length === 0) {
                emptyMessage.innerHTML = `
                    <i class="fas fa-gift"></i>
                    <p>Ainda não há presentes cadastrados na lista.</p>
                    <p>Use o botão "Gerenciar Presentes" para adicionar itens!</p>
                `;
            } else {
                const filterText = {
                    'available': 'disponíveis',
                    'reserved': 'reservados'
                };
                emptyMessage.innerHTML = `
                    <i class="fas fa-search"></i>
                    <p>Nenhum presente ${filterText[this.currentFilter]} encontrado.</p>
                `;
            }
        } else {
            emptyMessage.style.display = 'none';
            giftList.innerHTML = filteredGifts.map(gift => this.createGiftCard(gift)).join('');
        }
    }

    createGiftCard(gift) {
        const reservedClass = gift.reserved ? 'reserved' : '';
        const statusBadge = gift.reserved 
            ? `<span class="status-badge status-reserved"><i class="fas fa-check-circle"></i> Reservado</span>`
            : `<span class="status-badge status-available"><i class="fas fa-heart"></i> Disponível</span>`;
        
        const actionButton = gift.reserved 
            ? `<div class="reserved-by">Reservado por: <strong>${gift.reservedBy}</strong></div>`
            : `<button class="reserve-btn" onclick="giftManager.openReservationModal('${gift.id}')">
                <i class="fas fa-heart"></i> Reservar
               </button>`;

        return `
            <div class="gift-item ${reservedClass}">
                <div class="gift-header">
                    <div class="gift-name">${gift.name}</div>
                    <button class="remove-btn" onclick="giftManager.removeGift('${gift.id}')" title="Remover presente">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="gift-status">
                    ${statusBadge}
                    ${actionButton}
                </div>
            </div>
        `;
    }

    openReservationModal(giftId) {
        const gift = this.gifts.find(g => g.id === giftId);
        if (!gift || gift.reserved) {
            this.showAlert('Este presente não está mais disponível!', 'warning');
            return;
        }

        document.getElementById('modalGiftName').textContent = `Presente: ${gift.name}`;
        document.getElementById('reservationModal').style.display = 'block';
        document.getElementById('guestName').value = '';
        document.getElementById('guestName').focus();
        
        // Store the gift ID for later use
        document.getElementById('reservationModal').dataset.giftId = giftId;
    }

    closeModal() {
        document.getElementById('reservationModal').style.display = 'none';
    }

    confirmReservation() {
        const giftId = document.getElementById('reservationModal').dataset.giftId;
        const guestName = document.getElementById('guestName').value.trim();

        if (!guestName) {
            this.showAlert('Por favor, digite seu nome!', 'warning');
            document.getElementById('guestName').focus();
            return;
        }

        const gift = this.gifts.find(g => g.id === giftId);
        if (!gift) {
            this.showAlert('Presente não encontrado!', 'error');
            this.closeModal();
            return;
        }

        if (gift.reserved) {
            this.showAlert('Este presente já foi reservado!', 'warning');
            this.closeModal();
            this.renderGiftList();
            return;
        }

        // Reserve the gift in Firebase
        this.db.collection('gifts').doc(giftId).update({
            reserved: true,
            reservedBy: guestName,
            reservedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            this.closeModal();
            this.showAlert(`Obrigado, ${guestName}! O presente "${gift.name}" foi reservado com sucesso! 💕`, 'success');
        })
        .catch((error) => {
            console.error('Erro ao reservar presente:', error);
            this.showAlert('Erro ao reservar presente. Tente novamente.', 'error');
        });
    }

    removeGift(giftId) {
        const gift = this.gifts.find(g => g.id === giftId);
        if (!gift) {
            this.showAlert('Presente não encontrado!', 'error');
            return;
        }

        if (confirm(`Tem certeza que deseja remover o presente "${gift.name}"?`)) {
            this.db.collection('gifts').doc(giftId).delete()
                .then(() => {
                    this.showAlert('Presente removido com sucesso!', 'success');
                })
                .catch((error) => {
                    console.error('Erro ao remover presente:', error);
                    this.showAlert('Erro ao remover presente. Tente novamente.', 'error');
                });
        }
    }

    loadGiftsFromFirebase() {
        // Listen for real-time updates
        this.db.collection('gifts').orderBy('createdAt', 'desc')
            .onSnapshot((querySnapshot) => {
                this.gifts = [];
                querySnapshot.forEach((doc) => {
                    this.gifts.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderGiftList();
            }, (error) => {
                console.error('Erro ao carregar presentes:', error);
                this.showAlert('Erro ao carregar presentes do servidor.', 'error');
            });
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00b894' : type === 'warning' ? '#fdcb6e' : '#e17055'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 1001;
            max-width: 300px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        alert.textContent = message;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(alert);

        // Remove alert after 4 seconds
        setTimeout(() => {
            alert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 300);
        }, 4000);
    }

    // Method to export data (for backup)
    exportData() {
        const data = {
            gifts: this.gifts,
            exportDate: new Date().toISOString(),
            coupleNames: 'Cristiano & Luana'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lista-presentes-cristiano-luana.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Method to import data (for backup restoration)
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.gifts && Array.isArray(data.gifts)) {
                this.gifts = data.gifts;
                this.saveGifts();
                this.renderGiftList();
                this.showAlert('Dados importados com sucesso!', 'success');
                return true;
            } else {
                throw new Error('Formato de dados inválido');
            }
        } catch (error) {
            this.showAlert('Erro ao importar dados: ' + error.message, 'error');
            return false;
        }
    }
}

// Initialize the gift list manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.giftManager = new GiftListManager();
    
    // Clear all data from Firebase
    window.clearAllData = () => {
        if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita!')) {
            const batch = window.giftManager.db.batch();
            
            window.giftManager.db.collection('gifts').get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    return batch.commit();
                })
                .then(() => {
                    window.giftManager.showAlert('Todos os dados foram limpos!', 'success');
                })
                .catch((error) => {
                    console.error('Erro ao limpar dados:', error);
                    window.giftManager.showAlert('Erro ao limpar dados. Tente novamente.', 'error');
                });
        }
    };
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('reservationModal');
        if (modal.style.display === 'block') {
            window.giftManager.closeModal();
        }
    }
    
    // Ctrl+Shift+A to toggle admin panel
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        document.getElementById('toggleAdmin').click();
    }
});

// Add export functionality (can be called from browser console)
window.exportGiftData = () => {
    if (window.giftManager) {
        window.giftManager.exportData();
    }
};

// Add import functionality (can be called from browser console)
window.importGiftData = (jsonString) => {
    if (window.giftManager) {
        return window.giftManager.importData(jsonString);
    }
    return false;
};