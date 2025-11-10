import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Users, Calendar, Award, Trash2, BarChart3, ClipboardList, Download, Play, Clock, LogOut, Lock } from 'lucide-react';

const PadelTournament = () => {
  const [activeTab, setActiveTab] = useState('gironi');
  const [userRole, setUserRole] = useState(null); // null, 'organizer', 'player'
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [dataLoaded, setDataLoaded] = useState(false); // Flag per tracciare il caricamento completato
  
  const ORGANIZER_PASSWORD = 'acop2025'; // Password per organizzatore
  
  const initialTeams = {
    girone1: [
      { id: 1, name: 'NIBALI - CICCIA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 2, name: 'TIRENNA - DI MAIO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 3, name: 'NICOLOSI - CONDORELLI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 4, name: 'CARBONARO - ASERO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 5, name: 'SALPIETRO - BELLIA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }
    ],
    girone2: [
      { id: 6, name: 'RONSIVALLE - LONGO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 7, name: 'LO RE - SANTANGELO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 8, name: 'BIRTOLO - CORDOVANA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 9, name: 'ASTUTI - PERROTTA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
      { id: 10, name: 'FALLICA - SINATRA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }
    ]
  };

  const [teams, setTeams] = useState(initialTeams);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState({ girone: 'girone1', team1: '', team2: '', score1: '', score2: '', duration: '' });
  const [presentTeams, setPresentTeams] = useState(new Set());
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [tempTeamName, setTempTeamName] = useState('');
  const [ongoingMatches, setOngoingMatches] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [finishingMatch, setFinishingMatch] = useState(null);
  const [quickResult, setQuickResult] = useState({ score1: '', score2: '' });
  const [tournamentStartTime, setTournamentStartTime] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [finalMatches, setFinalMatches] = useState([]); // Partite fase finale completate
  const [ongoingFinalMatches, setOngoingFinalMatches] = useState([]); // Partite fase finale in corso
  const [isUserInteracting, setIsUserInteracting] = useState(false); // Blocca sync durante interazioni
  const [lastLocalUpdate, setLastLocalUpdate] = useState(Date.now()); // Timestamp ultima modifica locale

  // Funzione per caricare i dati con merge intelligente
  const loadData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setIsSyncing(true);
    try {
      const data = await window.storage.get('tournament-data', true).catch(() => null);

      if (data?.value) {
        const tournamentData = JSON.parse(data.value);
        const now = Date.now();
        
        // Se l'utente ha fatto modifiche negli ultimi 3 secondi, non sovrascrivere
        const recentLocalUpdate = now - lastLocalUpdate < 3000;
        
        if (tournamentData.teams && !recentLocalUpdate) {
          setTeams(tournamentData.teams);
        }
        if (tournamentData.matches && !recentLocalUpdate) {
          setMatches(tournamentData.matches);
        }
        // Presenze: non sovrascrivere se modificate di recente
        if (tournamentData.presentTeams && !recentLocalUpdate) {
          setPresentTeams(new Set(tournamentData.presentTeams));
        }
        // IMPORTANTE: Merge intelligente per partite in corso
        if (tournamentData.ongoingMatches && !recentLocalUpdate) {
          setOngoingMatches(prev => {
            if (prev.length === 0) return tournamentData.ongoingMatches;
            
            const localIds = prev.map(m => `${m.girone}-${m.team1}-${m.team2}`);
            const serverMatches = tournamentData.ongoingMatches.filter(m => {
              const id = `${m.girone}-${m.team1}-${m.team2}`;
              return !localIds.includes(id);
            });
            
            return [...prev, ...serverMatches];
          });
        }
        if (tournamentData.tournamentStartTime) {
          setTournamentStartTime(tournamentData.tournamentStartTime);
        }
        if (tournamentData.finalMatches && !recentLocalUpdate) {
          setFinalMatches(tournamentData.finalMatches);
        }
        if (tournamentData.ongoingFinalMatches && !recentLocalUpdate) {
          setOngoingFinalMatches(tournamentData.ongoingFinalMatches);
        }
        setLastSyncTime(Date.now());
        
        // IMPORTANTE: Setta il flag che i dati sono stati caricati
        if (!dataLoaded) {
          setDataLoaded(true);
        }
      } else {
        // Anche se non ci sono dati salvati, segna come caricato
        if (!dataLoaded) {
          setDataLoaded(true);
        }
      }
    } catch (error) {
      console.log('Errore nel caricamento dati:', error);
      // Anche in caso di errore, segna come caricato per non bloccare l'app
      if (!dataLoaded) {
        setDataLoaded(true);
      }
    } finally {
      if (showSyncIndicator) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  // Carica i dati salvati all'avvio - VERSIONE ROBUSTA
  useEffect(() => {
    const initialLoad = async () => {
      console.log('🔄 INIZIO Caricamento dati salvati...');
      setIsLoading(true);
      
      try {
        const data = await window.storage.get('tournament-data', true).catch(() => null);
        
        if (data?.value) {
          console.log('📦 Dati trovati nello storage, caricamento in corso...');
          const tournamentData = JSON.parse(data.value);
          
          // Carica TUTTI i dati in sequenza
          if (tournamentData.teams) {
            console.log('✅ Caricamento teams');
            setTeams(tournamentData.teams);
          }
          if (tournamentData.matches) {
            console.log(`✅ Caricamento ${tournamentData.matches.length} partite`);
            setMatches(tournamentData.matches);
          }
          if (tournamentData.presentTeams) {
            console.log('✅ Caricamento presenze');
            setPresentTeams(new Set(tournamentData.presentTeams));
          }
          if (tournamentData.ongoingMatches) {
            console.log(`✅ Caricamento ${tournamentData.ongoingMatches.length} partite in corso`);
            setOngoingMatches(tournamentData.ongoingMatches);
          }
          if (tournamentData.tournamentStartTime) {
            console.log('✅ Caricamento orario inizio');
            setTournamentStartTime(tournamentData.tournamentStartTime);
          }
          if (tournamentData.finalMatches) {
            console.log('✅ Caricamento partite finali');
            setFinalMatches(tournamentData.finalMatches);
          }
          if (tournamentData.ongoingFinalMatches) {
            console.log('✅ Caricamento partite finali in corso');
            setOngoingFinalMatches(tournamentData.ongoingFinalMatches);
          }
        } else {
          console.log('ℹ️ Nessun dato salvato trovato - Nuovo torneo');
        }
      } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
      } finally {
        // IMPORTANTE: Setta dataLoaded DOPO aver caricato tutto
        console.log('✅ FINE Caricamento - Flag dataLoaded attivato');
        setDataLoaded(true);
        setIsLoading(false);
      }
    };

    initialLoad();
  }, []); // IMPORTANTE: array vuoto - esegui solo al mount

  // Polling automatico per sincronizzazione in tempo reale
  useEffect(() => {
    if (isLoading || !userRole) return; // Non fare polling durante caricamento o se non loggato
    
    const interval = setInterval(() => {
      // Non fare refresh se l'utente sta interagendo con l'app
      if (!editingTeam && !finishingMatch && !isUserInteracting) {
        loadData(true); // Mostra indicatore di sync
      }
    }, 5000); // Ogni 5 secondi

    return () => clearInterval(interval);
  }, [isLoading, userRole, editingTeam, finishingMatch, isUserInteracting]);

  // Salva i dati automaticamente quando cambiano
  useEffect(() => {
    if (isLoading) return; // Non salvare durante il caricamento iniziale
    if (!dataLoaded) return; // CRITICO: Non salvare finché i dati non sono stati caricati
    if (editingTeam) return; // Non salvare mentre si sta modificando un nome
    
    const saveData = async () => {
      setSaveStatus('saving');
      try {
        // Combina tutti i dati in un unico oggetto per ridurre le chiamate
        const tournamentData = {
          teams,
          matches,
          presentTeams: [...presentTeams],
          ongoingMatches,
          tournamentStartTime,
          finalMatches,
          ongoingFinalMatches
        };
        
        const result = await window.storage.set('tournament-data', JSON.stringify(tournamentData), true);
        
        if (result) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 2000);
        } else {
          console.warn('Salvataggio non riuscito - risultato null');
          setSaveStatus('');
        }
      } catch (error) {
        // Gestione silenziosa degli errori non critici
        if (error.message && error.message.includes('not found')) {
          // Errore normale quando non ci sono dati precedenti
          console.log('Prima volta che salviamo i dati');
        } else {
          console.error('Errore nel salvataggio:', error);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(''), 3000);
        }
      }
    };

    const timeoutId = setTimeout(saveData, 1000); // Debounce di 1 secondo
    return () => clearTimeout(timeoutId);
  }, [teams, matches, presentTeams, ongoingMatches, tournamentStartTime, isLoading, editingTeam, finalMatches, ongoingFinalMatches, dataLoaded]);

  // Funzione per salvataggio IMMEDIATO con blocco temporaneo del polling
  const saveImmediately = async (updatedData) => {
    setIsUserInteracting(true);
    setLastLocalUpdate(Date.now());
    
    try {
      const tournamentData = {
        teams: updatedData.teams || teams,
        matches: updatedData.matches || matches,
        presentTeams: updatedData.presentTeams ? [...updatedData.presentTeams] : [...presentTeams],
        ongoingMatches: updatedData.ongoingMatches || ongoingMatches,
        tournamentStartTime: updatedData.tournamentStartTime !== undefined ? updatedData.tournamentStartTime : tournamentStartTime,
        finalMatches: updatedData.finalMatches || finalMatches,
        ongoingFinalMatches: updatedData.ongoingFinalMatches || ongoingFinalMatches
      };
      
      await window.storage.set('tournament-data', JSON.stringify(tournamentData), true);
    } catch (error) {
      console.error('Errore salvataggio immediato:', error);
    } finally {
      // Sblocca il polling dopo 2 secondi
      setTimeout(() => setIsUserInteracting(false), 2000);
    }
  };

  // Aggiorna il timer ogni secondo per le partite in corso
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Genera tutte le partite round-robin con bilanciamento
  const scheduleMatches = useMemo(() => {
    // Genera tutte le partite possibili per ogni girone
    const generateAllMatches = (gironeTeams, gironeName) => {
      const allMatches = [];
      for (let i = 0; i < gironeTeams.length; i++) {
        for (let j = i + 1; j < gironeTeams.length; j++) {
          allMatches.push({
            girone: gironeName,
            team1: gironeTeams[i].name,
            team2: gironeTeams[j].name
          });
        }
      }
      return allMatches;
    };

    const girone1Matches = generateAllMatches(teams.girone1, 'girone1');
    const girone2Matches = generateAllMatches(teams.girone2, 'girone2');
    
    // Separiamo le partite per girone
    const remainingG1 = [...girone1Matches];
    const remainingG2 = [...girone2Matches];
    
    // Tracker per il numero di partite per squadra
    const teamMatchCount = {};
    [...teams.girone1, ...teams.girone2].forEach(team => {
      teamMatchCount[team.name] = 0;
    });
    
    const schedule = [];
    let turnoNumber = 1;
    const campi = ['A', 'B', 'C'];
    
    // Algoritmo di bilanciamento con equilibrio tra gironi
    while (remainingG1.length > 0 || remainingG2.length > 0) {
      const turno = {
        numero: turnoNumber++,
        partite: []
      };
      
      const teamsInThisTurno = new Set();
      const gironiInTurno = { girone1: 0, girone2: 0 };
      
      // Per ogni campo, trova la migliore partita da schedulare
      for (let campoIdx = 0; campoIdx < 3 && (remainingG1.length > 0 || remainingG2.length > 0); campoIdx++) {
        const campo = campi[campoIdx];
        
        // Determina da quale girone prendere la partita per bilanciare
        let selectedGirone = null;
        let remainingMatches = null;
        
        // Se un girone ha già 2 partite in questo turno, usa l'altro
        if (gironiInTurno.girone1 >= 2 && remainingG2.length > 0) {
          selectedGirone = 'girone2';
          remainingMatches = remainingG2;
        } else if (gironiInTurno.girone2 >= 2 && remainingG1.length > 0) {
          selectedGirone = 'girone1';
          remainingMatches = remainingG1;
        } else {
          // Alterna tra i gironi o scegli quello con più partite rimanenti
          if (remainingG1.length > 0 && remainingG2.length > 0) {
            // Preferisci il girone con meno partite già schedulate in questo turno
            if (gironiInTurno.girone1 < gironiInTurno.girone2) {
              selectedGirone = 'girone1';
              remainingMatches = remainingG1;
            } else if (gironiInTurno.girone2 < gironiInTurno.girone1) {
              selectedGirone = 'girone2';
              remainingMatches = remainingG2;
            } else {
              // Se sono uguali, scegli quello con più partite rimanenti
              if (remainingG1.length >= remainingG2.length) {
                selectedGirone = 'girone1';
                remainingMatches = remainingG1;
              } else {
                selectedGirone = 'girone2';
                remainingMatches = remainingG2;
              }
            }
          } else if (remainingG1.length > 0) {
            selectedGirone = 'girone1';
            remainingMatches = remainingG1;
          } else if (remainingG2.length > 0) {
            selectedGirone = 'girone2';
            remainingMatches = remainingG2;
          }
        }
        
        if (!remainingMatches || remainingMatches.length === 0) continue;
        
        // Ordina le partite per priorità (squadre con meno partite giocate)
        const sortedMatches = remainingMatches
          .map(match => ({
            match,
            priority: teamMatchCount[match.team1] + teamMatchCount[match.team2]
          }))
          .filter(item => 
            // Non includere squadre già in questo turno
            !teamsInThisTurno.has(item.match.team1) && 
            !teamsInThisTurno.has(item.match.team2)
          )
          .sort((a, b) => a.priority - b.priority);
        
        if (sortedMatches.length > 0) {
          const selectedMatch = sortedMatches[0].match;
          
          turno.partite.push({
            ...selectedMatch,
            campo: campo,
            played: false
          });
          
          // Aggiorna i contatori
          teamMatchCount[selectedMatch.team1]++;
          teamMatchCount[selectedMatch.team2]++;
          teamsInThisTurno.add(selectedMatch.team1);
          teamsInThisTurno.add(selectedMatch.team2);
          gironiInTurno[selectedMatch.girone]++;
          
          // Rimuovi la partita dalla lista corretta
          const matchIndex = remainingMatches.findIndex(m => 
            m.team1 === selectedMatch.team1 && 
            m.team2 === selectedMatch.team2
          );
          if (matchIndex !== -1) {
            remainingMatches.splice(matchIndex, 1);
          }
        }
      }
      
      if (turno.partite.length > 0) {
        schedule.push(turno);
      }
    }
    
    return schedule;
  }, [teams]);

  // Verifica se una partita è stata giocata
  const isMatchPlayed = (team1, team2, girone) => {
    return matches.some(m => 
      m.girone === girone &&
      ((m.team1 === team1 && m.team2 === team2) || (m.team1 === team2 && m.team2 === team1))
    );
  };

  // Aggiorna lo stato "played" delle partite nel calendario
  const scheduleWithStatus = useMemo(() => {
    return scheduleMatches.map(turno => ({
      ...turno,
      partite: turno.partite.map(match => ({
        ...match,
        played: isMatchPlayed(match.team1, match.team2, match.girone)
      }))
    }));
  }, [scheduleMatches, matches]);

  const calculateStandings = (gironeTeams) => {
    return [...gironeTeams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.gamesWon - a.gamesLost;
      const diffB = b.gamesWon - b.gamesLost;
      if (diffB !== diffA) return diffB - diffA;
      return b.gamesWon - a.gamesWon;
    });
  };

  const addMatch = () => {
    if (!selectedMatch.team1 || !selectedMatch.team2 || !selectedMatch.score1 || !selectedMatch.score2) {
      setSuccessMessage('⚠️ ATTENZIONE\n\nCompila tutti i campi obbligatori prima di salvare il risultato!');
      setShowSuccessModal(true);
      return;
    }

    // Imposta l'orario di inizio del torneo al primo risultato inserito
    const newTournamentStartTime = matches.length === 0 && !tournamentStartTime ? Date.now() : tournamentStartTime;
    if (matches.length === 0 && !tournamentStartTime) {
      setTournamentStartTime(newTournamentStartTime);
    }

    const score1 = parseInt(selectedMatch.score1);
    const score2 = parseInt(selectedMatch.score2);
    
    // Cerca se questa partita è in corso
    const ongoingMatch = ongoingMatches.find(
      m => m.girone === selectedMatch.girone &&
           ((m.team1 === selectedMatch.team1 && m.team2 === selectedMatch.team2) ||
            (m.team1 === selectedMatch.team2 && m.team2 === selectedMatch.team1))
    );
    
    // Calcola automaticamente la durata se la partita era in corso (in secondi)
    let duration = selectedMatch.duration ? parseInt(selectedMatch.duration) * 60 : null; // converti minuti in secondi
    if (ongoingMatch && !selectedMatch.duration) {
      duration = Math.round((Date.now() - ongoingMatch.startTime) / 1000); // Secondi
    }
    
    const newMatch = {
      id: Date.now(),
      girone: selectedMatch.girone,
      team1: selectedMatch.team1,
      team2: selectedMatch.team2,
      score1,
      score2,
      duration,
      winner: score1 > score2 ? selectedMatch.team1 : selectedMatch.team2
    };

    const updatedMatches = [...matches, newMatch];
    setMatches(updatedMatches);

    // Rimuovi la partita dalle partite in corso
    const updatedOngoing = ongoingMatch 
      ? ongoingMatches.filter(m => m !== ongoingMatch)
      : ongoingMatches;
    if (ongoingMatch) {
      setOngoingMatches(updatedOngoing);
    }

    const updatedTeams = { ...teams };
    const gironeTeams = updatedTeams[selectedMatch.girone];
    
    const team1Index = gironeTeams.findIndex(t => t.name === selectedMatch.team1);
    const team2Index = gironeTeams.findIndex(t => t.name === selectedMatch.team2);

    if (score1 > score2) {
      gironeTeams[team1Index].wins += 1;
      gironeTeams[team1Index].points += 3;
      gironeTeams[team2Index].losses += 1;
    } else {
      gironeTeams[team2Index].wins += 1;
      gironeTeams[team2Index].points += 3;
      gironeTeams[team1Index].losses += 1;
    }

    gironeTeams[team1Index].gamesWon += score1;
    gironeTeams[team1Index].gamesLost += score2;
    gironeTeams[team2Index].gamesWon += score2;
    gironeTeams[team2Index].gamesLost += score1;

    setTeams(updatedTeams);
    setSelectedMatch({ girone: 'girone1', team1: '', team2: '', score1: '', score2: '', duration: '' });
    
    // Salva immediatamente con blocco polling
    saveImmediately({
      teams: updatedTeams,
      matches: updatedMatches,
      ongoingMatches: updatedOngoing,
      tournamentStartTime: newTournamentStartTime
    });
  };

  const deleteMatch = (matchId) => {
    const matchToDelete = matches.find(m => m.id === matchId);
    if (!matchToDelete) return;

    // Rimuovi il match
    const updatedMatches = matches.filter(m => m.id !== matchId);
    setMatches(updatedMatches);

    // Se non ci sono più partite, resetta l'orario di inizio
    if (updatedMatches.length === 0) {
      setTournamentStartTime(null);
    }

    // Aggiorna le statistiche delle squadre
    const updatedTeams = { ...teams };
    const gironeTeams = updatedTeams[matchToDelete.girone];
    
    const team1Index = gironeTeams.findIndex(t => t.name === matchToDelete.team1);
    const team2Index = gironeTeams.findIndex(t => t.name === matchToDelete.team2);

    // Inverti le operazioni fatte quando è stato aggiunto il match
    if (matchToDelete.score1 > matchToDelete.score2) {
      gironeTeams[team1Index].wins -= 1;
      gironeTeams[team1Index].points -= 3;
      gironeTeams[team2Index].losses -= 1;
    } else {
      gironeTeams[team2Index].wins -= 1;
      gironeTeams[team2Index].points -= 3;
      gironeTeams[team1Index].losses -= 1;
    }

    gironeTeams[team1Index].gamesWon -= matchToDelete.score1;
    gironeTeams[team1Index].gamesLost -= matchToDelete.score2;
    gironeTeams[team2Index].gamesWon -= matchToDelete.score2;
    gironeTeams[team2Index].gamesLost -= matchToDelete.score1;

    setTeams(updatedTeams);
  };

  const toggleTeamPresence = (teamName) => {
    const newPresent = new Set(presentTeams);
    if (newPresent.has(teamName)) {
      newPresent.delete(teamName);
    } else {
      newPresent.add(teamName);
    }
    setPresentTeams(newPresent);
    
    // Salva immediatamente con blocco polling
    saveImmediately({ presentTeams: newPresent });
  };

  const isMatchAvailable = (match) => {
    return presentTeams.has(match.team1) && presentTeams.has(match.team2);
  };

  // Verifica se una squadra è già in campo
  const isTeamPlaying = (teamName) => {
    return ongoingMatches.some(m => m.team1 === teamName || m.team2 === teamName);
  };

  // Verifica se un campo è già occupato
  const isCampoOccupied = (campo) => {
    return ongoingMatches.some(m => m.campo === campo);
  };

  // Verifica se una partita può essere avviata
  const canStartMatch = (match) => {
    // Controllo 1: massimo 3 partite contemporaneamente
    if (ongoingMatches.length >= 3) {
      return { canStart: false, reason: 'Massimo 3 partite contemporaneamente!' };
    }
    
    // Controllo 2: campo già occupato
    if (isCampoOccupied(match.campo)) {
      return { canStart: false, reason: `Campo ${match.campo} già occupato!` };
    }
    
    // Controllo 3: squadra 1 già in campo
    if (isTeamPlaying(match.team1)) {
      return { canStart: false, reason: `${match.team1} sta già giocando!` };
    }
    
    // Controllo 4: squadra 2 già in campo
    if (isTeamPlaying(match.team2)) {
      return { canStart: false, reason: `${match.team2} sta già giocando!` };
    }
    
    return { canStart: true };
  };

  const startMatch = (match) => {
    // Controllo 1: massimo 3 partite contemporaneamente
    if (ongoingMatches.length >= 3) {
      setSuccessMessage('⚠️ IMPOSSIBILE AVVIARE\n\nMassimo 3 partite contemporaneamente!');
      setShowSuccessModal(true);
      return;
    }
    
    // Controllo 2: squadre già in campo
    if (isTeamPlaying(match.team1)) {
      setSuccessMessage(`⚠️ IMPOSSIBILE AVVIARE\n\n${match.team1} sta già giocando!`);
      setShowSuccessModal(true);
      return;
    }
    
    if (isTeamPlaying(match.team2)) {
      setSuccessMessage(`⚠️ IMPOSSIBILE AVVIARE\n\n${match.team2} sta già giocando!`);
      setShowSuccessModal(true);
      return;
    }
    
    // FLESSIBILITÀ: Se il campo assegnato è occupato, cerca un campo libero
    let campoToUse = match.campo;
    if (isCampoOccupied(match.campo)) {
      const campiLiberi = ['A', 'B', 'C'].filter(c => !isCampoOccupied(c));
      if (campiLiberi.length > 0) {
        campoToUse = campiLiberi[0];
        console.log(`Campo ${match.campo} occupato, uso campo ${campoToUse}`);
      } else {
        setSuccessMessage('⚠️ IMPOSSIBILE AVVIARE\n\nTutti i campi sono occupati!');
        setShowSuccessModal(true);
        return;
      }
    }

    const newOngoing = {
      team1: match.team1,
      team2: match.team2,
      girone: match.girone,
      campo: campoToUse,
      startTime: Date.now(),
      originalCampo: match.campo // Salva il campo originale per riferimento
    };
    
    const updatedOngoing = [...ongoingMatches, newOngoing];
    setOngoingMatches(updatedOngoing);
    
    // Mostra messaggio se il campo è stato cambiato
    if (campoToUse !== match.campo) {
      setSuccessMessage(`✅ PARTITA AVVIATA\n\nCampo ${match.campo} occupato.\nPartita spostata al Campo ${campoToUse}`);
      setShowSuccessModal(true);
    }
    
    // Salva immediatamente con blocco polling
    saveImmediately({ ongoingMatches: updatedOngoing });
  };

  const handleOrganizerLogin = () => {
    if (loginPassword === ORGANIZER_PASSWORD) {
      setUserRole('organizer');
      setLoginError('');
      setLoginPassword('');
    } else {
      setLoginError('Password errata!');
    }
  };

  const handlePlayerLogin = () => {
    setUserRole('player');
    setLoginError('');
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setUserRole(null);
    setLoginPassword('');
    setLoginError('');
    setShowLogoutConfirm(false);
    // Reset anche altri stati
    setActiveTab('gironi');
    setSelectedMatch({ girone: 'girone1', team1: '', team2: '', score1: '', score2: '', duration: '' });
  };

  // Funzione per resettare completamente il torneo (inclusi dati salvati)
  const resetTournamentCompletely = async () => {
    console.log('🔄 Reset Torneo - Inizio processo...');
    
    try {
      const freshTeams = {
        girone1: [
          { id: 1, name: 'NICOLOSI / BUEMI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 2, name: 'SANTANGELO / BUEMI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 3, name: 'SALPIETRO / CORSARO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 4, name: 'CORDOVANA / PIANA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 5, name: 'CARUSO / NIBALI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 6, name: "MARTELLA / PATERNO'", wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }
        ],
        girone2: [
          { id: 7, name: 'BIRTOLO / FORTESE', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 8, name: 'LO RE / FAZIO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 9, name: 'BELLIA / ASTUTI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 10, name: 'RONSIVALLE / LAUDANI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 11, name: 'CORALLO / LAUDANI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 12, name: 'SPINELLI / SCUDERI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }
        ]
      };
      
      // Resetta tutti gli stati
      setTeams(freshTeams);
      setMatches([]);
      setPresentTeams(new Set());
      setEditingTeam(null);
      setTempTeamName('');
      setOngoingMatches([]);
      setFinishingMatch(null);
      setQuickResult({ score1: '', score2: '' });
      setTournamentStartTime(null);
      setFinalMatches([]);
      setOngoingFinalMatches([]);
      
      console.log('🔄 Stati locali resettati');

      // Cancella i dati salvati
      try {
        if (window.storage && typeof window.storage.delete === 'function') {
          console.log('🔄 Cancellazione storage...');
          await window.storage.delete('tournament-data', true);
          console.log('✅ Storage cancellato');
        }
      } catch (storageError) {
        console.log('ℹ️ Storage cleanup:', storageError.message || 'Already clean');
      }
      
      setShowResetModal(false);
      setSuccessMessage('TORNEO RESETTATO CON SUCCESSO!\n\nTutti i dati sono stati cancellati.\nPuoi iniziare un nuovo torneo da zero.');
      setShowSuccessModal(true);
      
      console.log('✅ Reset completato con successo');
    } catch (error) {
      console.error('❌ Errore durante il reset del torneo:', error);
      setShowResetModal(false);
      setSuccessMessage('Si è verificato un errore durante il reset.\nRiprova o ricarica la pagina.');
      setShowSuccessModal(true);
    }
  };

  const downloadStandaloneVersion = () => {
    alert('⚠️ IMPORTANTE: Gli artifacts di Claude non supportano il salvataggio automatico dei dati.\n\nScarica questa versione standalone per usarla localmente sul tuo computer:\n\n1. Clicca OK per scaricare il file HTML\n2. Apri il file con il tuo browser\n3. I dati si salveranno automaticamente!\n\n✅ Funziona offline\n✅ Dati persistenti anche dopo refresh\n✅ Nessuna installazione necessaria');
    
    // Il codice verrà generato in un altro modo
    alert('Per ora, contatta l\'assistenza per ricevere la versione con salvataggio automatico.');
  };

  // Se non sei loggato, mostra la pagina di login
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center p-4">
        {isLoading ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-white/20 text-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">Caricamento dati del torneo...</p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-white/20 max-w-md w-full">
          <div className="text-center mb-8">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">ACOP Padel Indoor</h1>
            <p className="text-white/70">Gestionale Torneo</p>
            <p className="text-white/40 text-xs mt-2">by AATech - antonio.astuti@gmail.com</p>
          </div>

          <div className="space-y-4">
            {/* Login Organizzatore */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/30">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Organizzatore</h2>
              {/* Partite In Corso */}
              {ongoingMatches.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 md:p-4 border border-yellow-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Partite In Corso</p>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-400">{ongoingMatches.length}</p>
                  <p className="text-xs text-white/60 mt-1">su 3 campi disponibili</p>
                </div>
              )}
              {ongoingMatches.length === 0 && (
                <div className="bg-gradient-to-br from-gray-500/20 to-slate-500/20 rounded-xl p-3 md:p-4 border border-gray-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Partite In Corso</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-400">0</p>
                  <p className="text-xs text-white/60 mt-1">nessuna partita attiva</p>
                </div>
              )}
              </div>
              <input
                type="password"
                placeholder="Inserisci password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleOrganizerLogin()}
                className="w-full bg-white/20 text-white rounded-lg px-4 py-3 mb-3 border border-white/30 focus:outline-none focus:border-white placeholder-white/50"
              />
              {loginError && (
                <p className="text-red-400 text-sm mb-3">{loginError}</p>
              )}
              <button
                onClick={handleOrganizerLogin}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                Accedi come Organizzatore
              </button>
              <p className="text-white/50 text-xs mt-2">Accesso completo a tutte le funzioni</p>
            </div>

            {/* Login Giocatore */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/30">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Giocatore</h2>
              </div>
              <button
                onClick={handlePlayerLogin}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                Accedi come Giocatore
              </button>
              <p className="text-white/50 text-xs mt-2">Solo visualizzazione, nessuna password richiesta</p>
            </div>
          </div>
        </div>
        )}
      </div>
    );
  }

  const stopMatch = (match) => {
    const updatedOngoing = ongoingMatches.filter(
      m => !(m.team1 === match.team1 && m.team2 === match.team2 && m.girone === match.girone)
    );
    setOngoingMatches(updatedOngoing);
    
    // Salva immediatamente con blocco polling
    saveImmediately({ ongoingMatches: updatedOngoing });
  };

  const isMatchOngoing = (match) => {
    return ongoingMatches.some(
      m => m.girone === match.girone &&
           ((m.team1 === match.team1 && m.team2 === match.team2) ||
            (m.team1 === match.team2 && m.team2 === match.team1))
    );
  };

  const getMatchDuration = (match) => {
    const ongoing = ongoingMatches.find(
      m => m.girone === match.girone &&
           ((m.team1 === match.team1 && m.team2 === match.team2) ||
            (m.team1 === match.team2 && m.team2 === match.team1))
    );
    if (!ongoing) return { minutes: 0, seconds: 0 };
    const totalSeconds = Math.floor((currentTime - ongoing.startTime) / 1000);
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60
    };
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    // Statistiche Avanzate
    const matchesWithDuration = matches.filter(m => m.duration);
    if (matchesWithDuration.length > 0) {
      const longest = matchesWithDuration.reduce((max, match) => 
        match.duration > max.duration ? match : max
      );
      const shortest = matchesWithDuration.reduce((min, match) => 
        match.duration < min.duration ? match : min
      );
      
      htmlContent += `
    <div class="section">
        <div class="section-title">⏱️ Statistiche Tempi di Gioco</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fca5a5 100%); padding: 20px; border-radius: 12px; border: 2px solid #f87171;">
                <h4 style="color: #991b1b; margin-bottom: 10px;">🔥 Partita Più Lunga</h4>
                <p style="font-size: 18px; font-weight: bold; color: #7f1d1d; margin-bottom: 8px;">
                    ${longest.team1} vs ${longest.team2}
                </p>
                <p style="font-size: 32px; font-weight: bold; color: #dc2626; margin: 10px 0;">
                    ${Math.floor(longest.duration / 60)}:${(longest.duration % 60).toString().padStart(2, '0')}
                </p>
                <p style="color: #7f1d1d; font-size: 14px;">
                    ${longest.score1} - ${longest.score2} • ${longest.girone === 'girone1' ? 'Girone 1' : 'Girone 2'}
                </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 20px; border-radius: 12px; border: 2px solid #10b981;">
                <h4 style="color: #065f46; margin-bottom: 10px;">⚡ Partita Più Breve</h4>
                <p style="font-size: 18px; font-weight: bold; color: #064e3b; margin-bottom: 8px;">
                    ${shortest.team1} vs ${shortest.team2}
                </p>
                <p style="font-size: 32px; font-weight: bold; color: #059669; margin: 10px 0;">
                    ${Math.floor(shortest.duration / 60)}:${(shortest.duration % 60).toString().padStart(2, '0')}
                </p>
                <p style="color: #064e3b; font-size: 14px;">
                    ${shortest.score1} - ${shortest.score2} • ${shortest.girone === 'girone1' ? 'Girone 1' : 'Girone 2'}
                </p>
            </div>
        </div>
    </div>
`;
    }

    // Record Squadre
    const bestAttack = [...teams.girone1, ...teams.girone2]
      .filter(t => t.wins + t.losses > 0)
      .sort((a, b) => b.gamesWon - a.gamesWon)[0];
    
    const bestDefense = [...teams.girone1, ...teams.girone2]
      .filter(t => t.wins + t.losses > 0)
      .sort((a, b) => a.gamesLost - b.gamesLost)[0];
    
    const unbeaten = [...teams.girone1, ...teams.girone2].filter(t => t.wins > 0 && t.losses === 0);
    const struggling = [...teams.girone1, ...teams.girone2]
      .filter(t => t.losses > 0 && t.wins === 0)
      .sort((a, b) => b.losses - a.losses);

    htmlContent += `
    <div class="section">
        <div class="section-title">🏅 Record e Prestazioni</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
            ${bestAttack ? `
            <div style="background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); padding: 20px; border-radius: 12px; border: 2px solid #f97316;">
                <h4 style="color: #9a3412; margin-bottom: 10px;">🔥 Migliore Attacco</h4>
                <p style="font-size: 20px; font-weight: bold; color: #7c2d12; margin-bottom: 8px;">
                    ${bestAttack.name}
                </p>
                <p style="font-size: 28px; font-weight: bold; color: #ea580c; margin: 10px 0;">
                    ${bestAttack.gamesWon} game
                </p>
                <p style="color: #7c2d12; font-size: 14px;">
                    Media: ${((bestAttack.gamesWon / (bestAttack.wins + bestAttack.losses)) || 0).toFixed(1)} game/partita
                </p>
            </div>
            ` : ''}
            
            ${bestDefense ? `
            <div style="background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%); padding: 20px; border-radius: 12px; border: 2px solid #3b82f6;">
                <h4 style="color: #1e3a8a; margin-bottom: 10px;">🛡️ Migliore Difesa</h4>
                <p style="font-size: 20px; font-weight: bold; color: #1e40af; margin-bottom: 8px;">
                    ${bestDefense.name}
                </p>
                <p style="font-size: 28px; font-weight: bold; color: #2563eb; margin: 10px 0;">
                    ${bestDefense.gamesLost} game subiti
                </p>
                <p style="color: #1e40af; font-size: 14px;">
                    Media: ${((bestDefense.gamesLost / (bestDefense.wins + bestDefense.losses)) || 0).toFixed(1)} game subiti/partita
                </p>
            </div>
            ` : ''}
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 20px; border-radius: 12px; border: 2px solid #10b981;">
                <h4 style="color: #065f46; margin-bottom: 15px;">✨ Squadre Imbattute</h4>
                ${unbeaten.length > 0 ? unbeaten.map(team => `
                    <div style="background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span style="font-weight: bold; color: #064e3b;">${team.name}</span>
                        <span style="color: #065f46;">${team.wins}V - 0P</span>
                    </div>
                `).join('') : '<p style="color: #065f46;">Nessuna squadra imbattuta</p>'}
            </div>
            
            <div style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); padding: 20px; border-radius: 12px; border: 2px solid #ef4444;">
                <h4 style="color: #991b1b; margin-bottom: 15px;">⚠️ In Difficoltà</h4>
                ${struggling.length > 0 ? struggling.map(team => `
                    <div style="background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span style="font-weight: bold; color: #7f1d1d;">${team.name}</span>
                        <span style="color: #991b1b;">0V - ${team.losses}P</span>
                    </div>
                `).join('') : '<p style="color: #991b1b;">Tutte le squadre hanno vinto almeno una partita</p>'}
            </div>
        </div>
    </div>
`;
  };

  const formatTimeWithSeconds = (minutes, seconds) => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const saveQuickResult = (ongoingMatch) => {
    if (!quickResult.score1 || !quickResult.score2) {
      setSuccessMessage('⚠️ ATTENZIONE\n\nInserisci entrambi i punteggi prima di salvare!');
      setShowSuccessModal(true);
      return;
    }

    // Imposta l'orario di inizio del torneo al primo risultato inserito
    if (matches.length === 0 && !tournamentStartTime) {
      setTournamentStartTime(ongoingMatch.startTime);
    }

    const score1 = parseInt(quickResult.score1);
    const score2 = parseInt(quickResult.score2);
    const duration = Math.round((Date.now() - ongoingMatch.startTime) / 1000); // Secondi

    const newMatch = {
      id: Date.now(),
      girone: ongoingMatch.girone,
      team1: ongoingMatch.team1,
      team2: ongoingMatch.team2,
      score1,
      score2,
      duration,
      winner: score1 > score2 ? ongoingMatch.team1 : ongoingMatch.team2
    };

    const updatedMatches = [...matches, newMatch];
    const updatedOngoing = ongoingMatches.filter(m => m !== ongoingMatch);
    
    setMatches(updatedMatches);
    setOngoingMatches(updatedOngoing);

    const updatedTeams = { ...teams };
    const gironeTeams = updatedTeams[ongoingMatch.girone];
    
    const team1Index = gironeTeams.findIndex(t => t.name === ongoingMatch.team1);
    const team2Index = gironeTeams.findIndex(t => t.name === ongoingMatch.team2);

    if (score1 > score2) {
      gironeTeams[team1Index].wins += 1;
      gironeTeams[team1Index].points += 3;
      gironeTeams[team2Index].losses += 1;
    } else {
      gironeTeams[team2Index].wins += 1;
      gironeTeams[team2Index].points += 3;
      gironeTeams[team1Index].losses += 1;
    }

    gironeTeams[team1Index].gamesWon += score1;
    gironeTeams[team1Index].gamesLost += score2;
    gironeTeams[team2Index].gamesWon += score2;
    gironeTeams[team2Index].gamesLost += score1;

    setTeams(updatedTeams);
    setFinishingMatch(null);
    setQuickResult({ score1: '', score2: '' });
    
    // Salva immediatamente con blocco polling
    saveImmediately({
      teams: updatedTeams,
      matches: updatedMatches,
      ongoingMatches: updatedOngoing,
      tournamentStartTime: matches.length === 0 && !tournamentStartTime ? ongoingMatch.startTime : tournamentStartTime
    });
  };

  const updateTeamName = (girone, teamId, newName) => {
    if (!newName.trim()) {
      setEditingTeam(null);
      setTempTeamName('');
      return;
    }
    
    const oldTeam = teams[girone]?.find(t => t.id === teamId);
    if (!oldTeam || oldTeam.name === newName.trim()) {
      setEditingTeam(null);
      setTempTeamName('');
      return;
    }
    
    const oldName = oldTeam.name;
    
    // Batch update - aggiorna tutto insieme per evitare rendering multipli
    const newNameTrimmed = newName.trim();
    
    // Aggiorna il nome della squadra
    const updatedTeams = {
      ...teams,
      [girone]: teams[girone].map(team => 
        team.id === teamId ? { ...team, name: newNameTrimmed } : team
      )
    };
    
    // Aggiorna i match già giocati
    const updatedMatches = matches.map(match => ({
      ...match,
      team1: match.team1 === oldName ? newNameTrimmed : match.team1,
      team2: match.team2 === oldName ? newNameTrimmed : match.team2,
      winner: match.winner === oldName ? newNameTrimmed : match.winner
    }));

    // Aggiorna le partite in corso
    const updatedOngoing = ongoingMatches.map(match => ({
      ...match,
      team1: match.team1 === oldName ? newNameTrimmed : match.team1,
      team2: match.team2 === oldName ? newNameTrimmed : match.team2
    }));

    // Aggiorna le presenze
    const updatedPresent = new Set(presentTeams);
    if (updatedPresent.has(oldName)) {
      updatedPresent.delete(oldName);
      updatedPresent.add(newNameTrimmed);
    }

    // Applica tutti gli aggiornamenti
    setTeams(updatedTeams);
    setMatches(updatedMatches);
    setOngoingMatches(updatedOngoing);
    setPresentTeams(updatedPresent);
    
    // Termina la modalità editing
    setEditingTeam(null);
    setTempTeamName('');
  };

  const resetTeamNames = () => {
    if (window.confirm('Sei sicuro di voler ripristinare tutti i nomi delle squadre? Questo cancellerà anche tutti i risultati e le presenze.')) {
      const freshTeams = {
        girone1: [
          { id: 1, name: 'NICOLOSI / BUEMI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 2, name: 'SANTANGELO / BUEMI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 3, name: 'SALPIETRO / CORSARO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 4, name: 'CORDOVANA / PIANA', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 5, name: 'CARUSO / NIBALI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 6, name: "MARTELLA / PATERNO'", wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }
        ],
        girone2: [
          { id: 7, name: 'BIRTOLO / FORTESE', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 8, name: 'LO RE / FAZIO', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 9, name: 'BELLIA / ASTUTI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 10, name: 'RONSIVALLE / LAUDANI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 11, name: 'CORALLO / LAUDANI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { id: 12, name: 'SPINELLI / SCUDERI', wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }
        ]
      };
      
      setTeams(freshTeams);
      setMatches([]);
      setPresentTeams(new Set());
      setEditingTeam(null);
      setTempTeamName('');
      setOngoingMatches([]);
      setFinishingMatch(null);
      setQuickResult({ score1: '', score2: '' });
      setTournamentStartTime(null);
    }
  };

  const generateStatisticsPDF = () => {
    const reportDate = new Date().toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const allTeams = [...teams.girone1, ...teams.girone2];
    const sortedByPoints = [...allTeams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.gamesWon - a.gamesLost;
      const diffB = b.gamesWon - b.gamesLost;
      if (diffB !== diffA) return diffB - diffA;
      return b.gamesWon - a.gamesWon;
    });

    const matchesWithDuration = matches.filter(m => m.duration);
    const totalGames = matches.reduce((sum, m) => sum + m.score1 + m.score2, 0);
    const avgDurationSeconds = matchesWithDuration.length > 0 
      ? matchesWithDuration.reduce((sum, m) => sum + m.duration, 0) / matchesWithDuration.length 
      : 0;
    
    const girone1Matches = matches.filter(m => m.girone === 'girone1');
    const girone2Matches = matches.filter(m => m.girone === 'girone2');
    
    const bestAttack = allTeams.filter(t => t.wins + t.losses > 0).sort((a, b) => b.gamesWon - a.gamesWon)[0];
    const bestDefense = allTeams.filter(t => t.wins + t.losses > 0).sort((a, b) => a.gamesLost - b.gamesLost)[0];
    const bestDifference = allTeams.filter(t => t.wins + t.losses > 0).sort((a, b) => (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost))[0];
    const mostWins = allTeams.filter(t => t.wins > 0).sort((a, b) => b.wins - a.wins)[0];
    const unbeaten = allTeams.filter(t => t.wins > 0 && t.losses === 0);
    const struggling = allTeams.filter(t => t.losses > 0 && t.wins === 0).sort((a, b) => b.losses - a.losses);
    
    const longest = matchesWithDuration.length > 0 ? matchesWithDuration.reduce((max, m) => m.duration > max.duration ? m : max) : null;
    const shortest = matchesWithDuration.length > 0 ? matchesWithDuration.reduce((min, m) => m.duration < min.duration ? m : min) : null;
    const highestScore = matches.length > 0 ? matches.reduce((max, m) => {
      const total = m.score1 + m.score2;
      const maxTotal = max.score1 + max.score2;
      return total > maxTotal ? m : max;
    }) : null;
    const lowestScore = matches.length > 0 ? matches.reduce((min, m) => {
      const total = m.score1 + m.score2;
      const minTotal = min.score1 + min.score2;
      return total < minTotal ? m : min;
    }) : null;
    const biggestWin = matches.length > 0 ? matches.reduce((max, m) => {
      const diff = Math.abs(m.score1 - m.score2);
      const maxDiff = Math.abs(max.score1 - max.score2);
      return diff > maxDiff ? m : max;
    }) : null;
    const closestMatch = matches.length > 0 ? matches.reduce((min, m) => {
      const diff = Math.abs(m.score1 - m.score2);
      const minDiff = Math.abs(min.score1 - min.score2);
      return diff < minDiff ? m : min;
    }) : null;

    let html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Statistiche Complete - ACOP Padel ${reportDate}</title>
<style>
body{font-family:Arial;padding:20px;background:#fff;color:#1a1a1a;line-height:1.6}
.header{text-align:center;padding:30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:15px;margin-bottom:30px}
.header h1{font-size:42px;margin:0 0 10px 0}
.section{background:#fff;padding:25px;margin-bottom:25px;border-radius:10px;border:2px solid #ddd;page-break-inside:avoid}
.section-title{font-size:24px;font-weight:900;color:#667eea;margin-bottom:20px;border-bottom:3px solid #667eea;padding-bottom:10px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin:20px 0}
.stat-box{background:#f8f9ff;padding:20px;border-radius:10px;text-align:center;border:2px solid #667eea}
.stat-value{font-size:36px;font-weight:900;color:#667eea;margin:10px 0}
.stat-label{font-size:12px;color:#666;text-transform:uppercase}
.record-box{padding:20px;border-radius:10px;margin:15px 0}
table{width:100%;border-collapse:collapse;margin:15px 0}
th{background:#667eea;color:white;padding:12px;text-align:center;font-weight:700}
td{padding:10px;text-align:center;border-bottom:1px solid #eee}
td:first-child,th:first-child{text-align:left}
tr:hover{background:#f8f9ff}
.highlight{background:#d4edda !important;font-weight:700}
@media print{body{padding:10px}.section{page-break-inside:avoid}}
</style>
</head>
<body>
<div class="header">
<h1>📊 ACOP PADEL INDOOR</h1>
<p style="font-size:20px;">Statistiche Complete del Torneo</p>
<p>Generato: ${reportDate}</p>
</div>

<div class="section">
<div class="section-title">📈 PANORAMICA GENERALE</div>
<div class="stat-grid">
<div class="stat-box">
<div class="stat-label">Partite Totali</div>
<div class="stat-value">${matches.length}</div>
<div class="stat-label">su 30 (${((matches.length/30)*100).toFixed(0)}%)</div>
</div>
<div class="stat-box">
<div class="stat-label">Game Totali</div>
<div class="stat-value">${totalGames}</div>
<div class="stat-label">${matches.length} partite</div>
</div>
<div class="stat-box">
<div class="stat-label">Media Game/Partita</div>
<div class="stat-value">${matches.length>0?(totalGames/matches.length).toFixed(1):'0'}</div>
</div>
<div class="stat-box">
<div class="stat-label">Girone 1</div>
<div class="stat-value">${girone1Matches.length}</div>
<div class="stat-label">partite (${((girone1Matches.length/15)*100).toFixed(0)}%)</div>
</div>
<div class="stat-box">
<div class="stat-label">Girone 2</div>
<div class="stat-value">${girone2Matches.length}</div>
<div class="stat-label">partite (${((girone2Matches.length/15)*100).toFixed(0)}%)</div>
</div>
<div class="stat-box">
<div class="stat-label">Squadre Totali</div>
<div class="stat-value">12</div>
<div class="stat-label">6 per girone</div>
</div>
</div>
</div>

${matchesWithDuration.length>0?`
<div class="section">
<div class="section-title">⏱️ STATISTICHE TEMPI</div>
<div class="stat-grid">
<div class="stat-box">
<div class="stat-label">Tempo Medio</div>
<div class="stat-value">${Math.floor(avgDurationSeconds/60)}:${Math.round(avgDurationSeconds%60).toString().padStart(2,'0')}</div>
<div class="stat-label">${matchesWithDuration.length} partite registrate</div>
</div>
<div class="stat-box">
<div class="stat-label">Tempo Totale</div>
<div class="stat-value">${Math.floor(matchesWithDuration.reduce((s,m)=>s+m.duration,0)/3600)}h ${Math.floor((matchesWithDuration.reduce((s,m)=>s+m.duration,0)%3600)/60)}m</div>
<div class="stat-label">gioco effettivo</div>
</div>
</div>
${longest?`
<div class="record-box" style="background:linear-gradient(135deg,#fef3c7,#fca5a5);border:2px solid #f87171">
<h3 style="color:#991b1b">🔥 PARTITA PIÙ LUNGA</h3>
<p style="font-weight:700;color:#7f1d1d;margin:10px 0">${longest.team1} vs ${longest.team2}</p>
<p style="font-size:32px;font-weight:900;color:#dc2626;margin:10px 0">${Math.floor(longest.duration/60)}:${(longest.duration%60).toString().padStart(2,'0')}</p>
<p style="color:#7f1d1d">Risultato: ${longest.score1}-${longest.score2} • ${longest.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
`:''}
${shortest?`
<div class="record-box" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:2px solid #10b981">
<h3 style="color:#065f46">⚡ PARTITA PIÙ BREVE</h3>
<p style="font-weight:700;color:#064e3b;margin:10px 0">${shortest.team1} vs ${shortest.team2}</p>
<p style="font-size:32px;font-weight:900;color:#059669;margin:10px 0">${Math.floor(shortest.duration/60)}:${(shortest.duration%60).toString().padStart(2,'0')}</p>
<p style="color:#064e3b">Risultato: ${shortest.score1}-${shortest.score2} • ${shortest.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
`:''}
</div>
`:''}

<div class="section">
<div class="section-title">🏆 RECORD SQUADRE</div>
${bestAttack?`
<div class="record-box" style="background:linear-gradient(135deg,#fed7aa,#fdba74);border:2px solid #f97316">
<h3 style="color:#9a3412">🔥 MIGLIORE ATTACCO</h3>
<p style="font-size:20px;font-weight:700;color:#7c2d12;margin:10px 0">${bestAttack.name}</p>
<p style="font-size:32px;font-weight:900;color:#ea580c;margin:10px 0">${bestAttack.gamesWon} game vinti</p>
<p style="color:#7c2d12">Media: ${((bestAttack.gamesWon/(bestAttack.wins+bestAttack.losses))||0).toFixed(1)} game/partita • ${bestAttack.wins+bestAttack.losses} partite giocate</p>
</div>
`:''}
${bestDefense?`
<div class="record-box" style="background:linear-gradient(135deg,#bfdbfe,#93c5fd);border:2px solid #3b82f6">
<h3 style="color:#1e3a8a">🛡️ MIGLIORE DIFESA</h3>
<p style="font-size:20px;font-weight:700;color:#1e40af;margin:10px 0">${bestDefense.name}</p>
<p style="font-size:32px;font-weight:900;color:#2563eb;margin:10px 0">${bestDefense.gamesLost} game subiti</p>
<p style="color:#1e40af">Media: ${((bestDefense.gamesLost/(bestDefense.wins+bestDefense.losses))||0).toFixed(1)} game subiti/partita • ${bestDefense.wins+bestDefense.losses} partite giocate</p>
</div>
`:''}
${bestDifference?`
<div class="record-box" style="background:linear-gradient(135deg,#fde68a,#fbbf24);border:2px solid #f59e0b">
<h3 style="color:#92400e">⭐ MIGLIORE DIFFERENZA RETI</h3>
<p style="font-size:20px;font-weight:700;color:#78350f;margin:10px 0">${bestDifference.name}</p>
<p style="font-size:32px;font-weight:900;color:#d97706;margin:10px 0">+${bestDifference.gamesWon-bestDifference.gamesLost}</p>
<p style="color:#78350f">${bestDifference.gamesWon} game vinti - ${bestDifference.gamesLost} game subiti</p>
</div>
`:''}
${mostWins?`
<div class="record-box" style="background:linear-gradient(135deg,#c7d2fe,#a5b4fc);border:2px solid #6366f1">
<h3 style="color:#312e81">💪 PIÙ VITTORIE</h3>
<p style="font-size:20px;font-weight:700;color:#3730a3;margin:10px 0">${mostWins.name}</p>
<p style="font-size:32px;font-weight:900;color:#4f46e5;margin:10px 0">${mostWins.wins} vittorie</p>
<p style="color:#3730a3">${mostWins.wins+mostWins.losses} partite giocate • ${mostWins.points} punti</p>
</div>
`:''}
</div>

${unbeaten.length>0||struggling.length>0?`
<div class="section">
<div class="section-title">📋 SITUAZIONI PARTICOLARI</div>
${unbeaten.length>0?`
<div class="record-box" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:2px solid #10b981">
<h3 style="color:#065f46">✨ SQUADRE IMBATTUTE (${unbeaten.length})</h3>
${unbeaten.map(t=>`
<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:6px;margin:8px 0;display:flex;justify-content:space-between">
<span style="font-weight:700;color:#064e3b">${t.name}</span>
<span style="color:#065f46;font-weight:700">${t.wins}V - 0P • ${t.gamesWon}-${t.gamesLost} game</span>
</div>
`).join('')}
</div>
`:''}
${struggling.length>0?`
<div class="record-box" style="background:linear-gradient(135deg,#fecaca,#fca5a5);border:2px solid #ef4444">
<h3 style="color:#991b1b">⚠️ IN DIFFICOLTÀ (${struggling.length})</h3>
${struggling.map(t=>`
<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:6px;margin:8px 0;display:flex;justify-content:space-between">
<span style="font-weight:700;color:#7f1d1d">${t.name}</span>
<span style="color:#991b1b;font-weight:700">0V - ${t.losses}P • ${t.gamesWon}-${t.gamesLost} game</span>
</div>
`).join('')}
</div>
`:''}
</div>
`:''}

${highestScore||lowestScore||biggestWin||closestMatch?`
<div class="section">
<div class="section-title">🎯 RECORD PARTITE</div>
${highestScore?`
<div class="record-box" style="background:linear-gradient(135deg,#fef3c7,#fde047);border:2px solid #eab308">
<h3 style="color:#854d0e">🔥 PIÙ GAME IN UNA PARTITA</h3>
<p style="font-weight:700;color:#713f12;margin:10px 0">${highestScore.team1} vs ${highestScore.team2}</p>
<p style="font-size:32px;font-weight:900;color:#ca8a04;margin:10px 0">${highestScore.score1+highestScore.score2} game totali</p>
<p style="color:#713f12">Risultato: ${highestScore.score1}-${highestScore.score2} • ${highestScore.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
`:''}
${lowestScore?`
<div class="record-box" style="background:linear-gradient(135deg,#ddd6fe,#c4b5fd);border:2px solid #a78bfa">
<h3 style="color:#5b21b6">⚡ MENO GAME IN UNA PARTITA</h3>
<p style="font-weight:700;color:#6b21a8;margin:10px 0">${lowestScore.team1} vs ${lowestScore.team2}</p>
<p style="font-size:32px;font-weight:900;color:#7c3aed;margin:10px 0">${lowestScore.score1+lowestScore.score2} game totali</p>
<p style="color:#6b21a8">Risultato: ${lowestScore.score1}-${lowestScore.score2} • ${lowestScore.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
`:''}
${biggestWin?`
<div class="record-box" style="background:linear-gradient(135deg,#fecdd3,#fda4af);border:2px solid #f43f5e">
<h3 style="color:#881337">💥 VITTORIA PIÙ LARGA</h3>
<p style="font-weight:700;color:#9f1239;margin:10px 0">${biggestWin.winner}</p>
<p style="font-size:32px;font-weight:900;color:#e11d48;margin:10px 0">+${Math.abs(biggestWin.score1-biggestWin.score2)} game</p>
<p style="color:#9f1239">${biggestWin.team1} ${biggestWin.score1}-${biggestWin.score2} ${biggestWin.team2} • ${biggestWin.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
`:''}
${closestMatch?`
<div class="record-box" style="background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border:2px solid #818cf8">
<h3 style="color:#3730a3">🎲 PARTITA PIÙ EQUILIBRATA</h3>
<p style="font-weight:700;color:#4338ca;margin:10px 0">${closestMatch.team1} vs ${closestMatch.team2}</p>
<p style="font-size:32px;font-weight:900;color:#6366f1;margin:10px 0">${Math.abs(closestMatch.score1-closestMatch.score2)} game di differenza</p>
<p style="color:#4338ca">Risultato: ${closestMatch.score1}-${closestMatch.score2} • ${closestMatch.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
`:''}
</div>
`:''}

<div class="section">
<div class="section-title">🥇 SQUADRE QUALIFICATE</div>
<div style="background:#d4edda;padding:15px;border-radius:8px;border:2px solid #28a745;margin-bottom:20px;text-align:center">
<p style="margin:0;color:#155724;font-weight:700;font-size:16px">✅ Le prime 2 squadre di ogni girone si qualificano per le semifinali</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
<div class="record-box" style="background:linear-gradient(135deg,#fef3c7,#fcd34d);border:2px solid #f59e0b">
<h3 style="color:#92400e;margin:0 0 15px 0">GIRONE 1 - QUALIFICATE</h3>
${calculateStandings(teams.girone1).slice(0,2).map((t,i)=>`
<div style="background:rgba(255,255,255,0.7);padding:15px;border-radius:8px;margin:10px 0">
<div style="display:flex;justify-content:space-between;align-items:center">
<div>
<span style="font-size:24px;font-weight:900;color:#92400e">${i+1}°</span>
<span style="font-size:18px;font-weight:700;color:#78350f;margin-left:10px">${t.name}</span>
</div>
<span style="font-size:20px;font-weight:900;color:#b45309">${t.points} pt</span>
</div>
<p style="color:#92400e;margin:8px 0 0 0;font-size:14px">${t.wins}V-${t.losses}P • ${t.gamesWon}-${t.gamesLost} game • ${t.gamesWon-t.gamesLost>0?'+':''}${t.gamesWon-t.gamesLost}</p>
</div>
`).join('')}
</div>
<div class="record-box" style="background:linear-gradient(135deg,#dbeafe,#60a5fa);border:2px solid #3b82f6">
<h3 style="color:#1e3a8a;margin:0 0 15px 0">GIRONE 2 - QUALIFICATE</h3>
${calculateStandings(teams.girone2).slice(0,2).map((t,i)=>`
<div style="background:rgba(255,255,255,0.7);padding:15px;border-radius:8px;margin:10px 0">
<div style="display:flex;justify-content:space-between;align-items:center">
<div>
<span style="font-size:24px;font-weight:900;color:#1e3a8a">${i+1}°</span>
<span style="font-size:18px;font-weight:700;color:#1e40af;margin-left:10px">${t.name}</span>
</div>
<span style="font-size:20px;font-weight:900;color:#2563eb">${t.points} pt</span>
</div>
<p style="color:#1e3a8a;margin:8px 0 0 0;font-size:14px">${t.wins}V-${t.losses}P • ${t.gamesWon}-${t.gamesLost} game • ${t.gamesWon-t.gamesLost>0?'+':''}${t.gamesWon-t.gamesLost}</p>
</div>
`).join('')}
</div>
</div>
</div>

<div class="section">
<div class="section-title">🥇 CLASSIFICA COMPLETA GIRONE 1</div>
<div style="background:#fef3c7;padding:12px;border-radius:8px;border:2px solid #f59e0b;margin-bottom:15px;text-align:center">
<strong style="color:#92400e">📊 ${girone1Matches.length}/15 partite giocate (${((girone1Matches.length/15)*100).toFixed(0)}%)</strong>
</div>
<table>
<tr><th>Pos</th><th>Squadra</th><th>PG</th><th>V</th><th>P</th><th>GF</th><th>GS</th><th>+/-</th><th>Pt</th><th>%V</th></tr>
${calculateStandings(teams.girone1).map((t,i)=>{
const d=t.gamesWon-t.gamesLost;
const pg=t.wins+t.losses;
const perc=pg>0?((t.wins/pg)*100).toFixed(0):0;
return `<tr class="${i<2?'highlight':''}"><td><b>${i+1}°</b></td><td><b>${t.name}</b></td><td>${pg}</td><td style="color:#10b981;font-weight:700">${t.wins}</td><td style="color:#ef4444;font-weight:700">${t.losses}</td><td style="color:#10b981">${t.gamesWon}</td><td style="color:#ef4444">${t.gamesLost}</td><td><b style="color:${d>=0?'#10b981':'#ef4444'}">${d>0?'+':''}${d}</b></td><td><b style="font-size:16px;color:#667eea">${t.points}</b></td><td>${perc}%</td></tr>`;
}).join('')}
</table>
</div>

<div class="section">
<div class="section-title">🥇 CLASSIFICA COMPLETA GIRONE 2</div>
<div style="background:#dbeafe;padding:12px;border-radius:8px;border:2px solid #3b82f6;margin-bottom:15px;text-align:center">
<strong style="color:#1e3a8a">📊 ${girone2Matches.length}/15 partite giocate (${((girone2Matches.length/15)*100).toFixed(0)}%)</strong>
</div>
<table>
<tr><th>Pos</th><th>Squadra</th><th>PG</th><th>V</th><th>P</th><th>GF</th><th>GS</th><th>+/-</th><th>Pt</th><th>%V</th></tr>
${calculateStandings(teams.girone2).map((t,i)=>{
const d=t.gamesWon-t.gamesLost;
const pg=t.wins+t.losses;
const perc=pg>0?((t.wins/pg)*100).toFixed(0):0;
return `<tr class="${i<2?'highlight':''}"><td><b>${i+1}°</b></td><td><b>${t.name}</b></td><td>${pg}</td><td style="color:#10b981;font-weight:700">${t.wins}</td><td style="color:#ef4444;font-weight:700">${t.losses}</td><td style="color:#10b981">${t.gamesWon}</td><td style="color:#ef4444">${t.gamesLost}</td><td><b style="color:${d>=0?'#10b981':'#ef4444'}">${d>0?'+':''}${d}</b></td><td><b style="font-size:16px;color:#667eea">${t.points}</b></td><td>${perc}%</td></tr>`;
}).join('')}
</table>
</div>

<div class="section">
<div class="section-title">📋 CLASSIFICA GENERALE FINALE</div>
<div style="background:#fff3cd;padding:12px;border-radius:8px;border:2px solid #ffc107;margin-bottom:15px;text-align:center">
<strong style="color:#856404">⚠️ Solo per fini statistici - Le qualificazioni si basano sulle classifiche dei singoli gironi</strong>
</div>
<table>
<tr><th>Pos</th><th>Squadra</th><th>Girone</th><th>PG</th><th>V</th><th>P</th><th>GF</th><th>GS</th><th>+/-</th><th>Pt</th><th>%V</th></tr>
${sortedByPoints.map((t,i)=>{
const g=teams.girone1.includes(t)?'1':'2';
const d=t.gamesWon-t.gamesLost;
const pg=t.wins+t.losses;
const perc=pg>0?((t.wins/pg)*100).toFixed(0):0;
return `<tr><td><b>${i+1}°</b></td><td><b>${t.name}</b></td><td><span style="background:${g==='1'?'#fef3c7':'#dbeafe'};color:${g==='1'?'#92400e':'#1e3a8a'};padding:4px 10px;border-radius:12px;font-weight:700">G${g}</span></td><td>${pg}</td><td style="color:#10b981;font-weight:700">${t.wins}</td><td style="color:#ef4444;font-weight:700">${t.losses}</td><td style="color:#10b981">${t.gamesWon}</td><td style="color:#ef4444">${t.gamesLost}</td><td><b style="color:${d>=0?'#10b981':'#ef4444'}">${d>0?'+':''}${d}</b></td><td><b style="font-size:16px;color:#667eea">${t.points}</b></td><td>${perc}%</td></tr>`;
}).join('')}
</table>
</div>

<div style="text-align:center;margin-top:40px;padding:20px;color:#666;border-top:2px solid #ddd">
<p>Statistiche generate: ${reportDate}</p>
<p style="margin-top:10px;font-weight:700;color:#667eea;font-size:18px">ACOP Padel Indoor - Gestionale Torneo</p>
<p style="margin-top:5px">by AATech - antonio.astuti@gmail.com</p>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statistiche-acop-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccessMessage('📊 STATISTICHE GENERATE!\n\nFile HTML scaricato con TUTTE le statistiche.\n\nPer PDF:\n1. Apri il file\n2. Stampa (Ctrl+P)\n3. "Salva come PDF"');
    setShowSuccessModal(true);
  };

  const generateCompletePDF = () => {
    const reportDate = new Date().toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const allTeams = [...teams.girone1, ...teams.girone2];
    const sortedByPoints = [...allTeams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.gamesWon - a.gamesLost;
      const diffB = b.gamesWon - b.gamesLost;
      if (diffB !== diffA) return diffB - diffA;
      return b.gamesWon - a.gamesWon;
    });

    const matchesWithDuration = matches.filter(m => m.duration);
    const totalGames = matches.reduce((sum, m) => sum + m.score1 + m.score2, 0);
    const avgDurationSeconds = matchesWithDuration.length > 0 
      ? matchesWithDuration.reduce((sum, m) => sum + m.duration, 0) / matchesWithDuration.length 
      : 0;
    
    const girone1Matches = matches.filter(m => m.girone === 'girone1');
    const girone2Matches = matches.filter(m => m.girone === 'girone2');

    let html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Report Completo Torneo ACOP - ${reportDate}</title>
<style>
body{font-family:Arial;padding:20px;background:#fff;color:#1a1a1a;line-height:1.6}
.header{text-align:center;padding:30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:15px;margin-bottom:30px}
.header h1{font-size:42px;margin:0 0 10px 0}
.section{background:#fff;padding:25px;margin-bottom:25px;border-radius:10px;border:2px solid #ddd;page-break-inside:avoid}
.section-title{font-size:24px;font-weight:900;color:#667eea;margin-bottom:20px;border-bottom:3px solid #667eea;padding-bottom:10px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin:20px 0}
.stat-box{background:#f8f9ff;padding:20px;border-radius:10px;text-align:center;border:2px solid #667eea}
.stat-value{font-size:36px;font-weight:900;color:#667eea;margin:10px 0}
.stat-label{font-size:12px;color:#666;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin:15px 0}
th{background:#667eea;color:white;padding:12px;text-align:center;font-weight:700}
td{padding:10px;text-align:center;border-bottom:1px solid #eee}
td:first-child,th:first-child{text-align:left}
tr:hover{background:#f8f9ff}
.highlight{background:#d4edda !important;font-weight:700}
.winner-box{background:linear-gradient(135deg,#f093fb,#f5576c);color:white;padding:40px;border-radius:15px;text-align:center;margin:20px 0}
.winner-box h2{font-size:48px;margin:20px 0}
@media print{body{padding:10px}.section{page-break-inside:avoid}}
</style>
</head>
<body>
<div class="header">
<h1>🏆 ACOP PADEL INDOOR</h1>
<p style="font-size:20px;">Report Completo del Torneo</p>
<p>Generato: ${reportDate}</p>
</div>
`;

    // VINCITORE TORNEO (se disponibile)
    const finaleResult = finalMatches.find(m => m.type === 'finale');
    if (finaleResult) {
      html += `
<div class="winner-box">
<div style="font-size:80px">🏆</div>
<h2>VINCITORE DEL TORNEO</h2>
<div style="font-size:48px;font-weight:900;margin:20px 0">${finaleResult.winner}</div>
<p style="font-size:18px;margin-top:15px">Congratulazioni! 🎉</p>
</div>
`;
    }

    // STATISTICHE GENERALI
    html += `
<div class="section">
<div class="section-title">📈 PANORAMICA GENERALE</div>
<div class="stat-grid">
<div class="stat-box">
<div class="stat-label">Partite Totali</div>
<div class="stat-value">${matches.length}</div>
<div class="stat-label">su 30 (${((matches.length/30)*100).toFixed(0)}%)</div>
</div>
<div class="stat-box">
<div class="stat-label">Game Totali</div>
<div class="stat-value">${totalGames}</div>
</div>
<div class="stat-box">
<div class="stat-label">Media Game/Partita</div>
<div class="stat-value">${matches.length>0?(totalGames/matches.length).toFixed(1):'0'}</div>
</div>
<div class="stat-box">
<div class="stat-label">Tempo Medio</div>
<div class="stat-value">${matchesWithDuration.length > 0 ? `${Math.floor(avgDurationSeconds/60)}:${Math.round(avgDurationSeconds%60).toString().padStart(2,'0')}` : '--'}</div>
<div class="stat-label">${matchesWithDuration.length > 0 ? `${matchesWithDuration.length} registrate` : 'minuti'}</div>
</div>
<div class="stat-box">
<div class="stat-label">Girone 1</div>
<div class="stat-value">${girone1Matches.length}</div>
<div class="stat-label">${((girone1Matches.length/15)*100).toFixed(0)}%</div>
</div>
<div class="stat-box">
<div class="stat-label">Girone 2</div>
<div class="stat-value">${girone2Matches.length}</div>
<div class="stat-label">${((girone2Matches.length/15)*100).toFixed(0)}%</div>
</div>
</div>
</div>
`;

    // RECORD TEMPI
    if (matchesWithDuration.length > 0) {
      const longest = matchesWithDuration.reduce((max, m) => m.duration > max.duration ? m : max);
      const shortest = matchesWithDuration.reduce((min, m) => m.duration < min.duration ? m : min);
      
      html += `
<div class="section">
<div class="section-title">⏱️ RECORD TEMPI DI GIOCO</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
<div style="background:linear-gradient(135deg,#fef3c7,#fca5a5);padding:20px;border-radius:12px;border:2px solid #f87171">
<h4 style="color:#991b1b;margin-bottom:10px">🔥 Partita Più Lunga</h4>
<p style="font-size:18px;font-weight:700;color:#7f1d1d;margin-bottom:8px">${longest.team1} vs ${longest.team2}</p>
<p style="font-size:32px;font-weight:900;color:#dc2626;margin:10px 0">${Math.floor(longest.duration/60)}:${(longest.duration%60).toString().padStart(2,'0')}</p>
<p style="color:#7f1d1d;font-size:14px">${longest.score1}-${longest.score2} • ${longest.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);padding:20px;border-radius:12px;border:2px solid #10b981">
<h4 style="color:#065f46;margin-bottom:10px">⚡ Partita Più Breve</h4>
<p style="font-size:18px;font-weight:700;color:#064e3b;margin-bottom:8px">${shortest.team1} vs ${shortest.team2}</p>
<p style="font-size:32px;font-weight:900;color:#059669;margin:10px 0">${Math.floor(shortest.duration/60)}:${(shortest.duration%60).toString().padStart(2,'0')}</p>
<p style="color:#064e3b;font-size:14px">${shortest.score1}-${shortest.score2} • ${shortest.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
</div>
</div>
`;
    }

    // RECORD SQUADRE
    const bestAttack = allTeams.filter(t => t.wins + t.losses > 0).sort((a,b) => b.gamesWon - a.gamesWon)[0];
    const bestDefense = allTeams.filter(t => t.wins + t.losses > 0).sort((a,b) => a.gamesLost - b.gamesLost)[0];
    const bestDifference = allTeams.filter(t => t.wins + t.losses > 0).sort((a,b) => (b.gamesWon-b.gamesLost)-(a.gamesWon-a.gamesLost))[0];
    const mostWins = allTeams.filter(t => t.wins > 0).sort((a,b) => b.wins - a.wins)[0];
    
    if (bestAttack || bestDefense || bestDifference || mostWins) {
      html += `
<div class="section">
<div class="section-title">🏅 RECORD SQUADRE</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
`;
      
      if (bestAttack) {
        html += `
<div style="background:linear-gradient(135deg,#fed7aa,#fdba74);padding:20px;border-radius:12px;border:2px solid #f97316">
<h4 style="color:#9a3412;margin-bottom:10px">🔥 Migliore Attacco</h4>
<p style="font-size:20px;font-weight:700;color:#7c2d12;margin-bottom:8px">${bestAttack.name}</p>
<p style="font-size:32px;font-weight:900;color:#ea580c;margin:10px 0">${bestAttack.gamesWon} game</p>
<p style="color:#7c2d12;font-size:14px">Media: ${((bestAttack.gamesWon/(bestAttack.wins+bestAttack.losses))||0).toFixed(1)} game/partita</p>
</div>
`;
      }
      
      if (bestDefense) {
        html += `
<div style="background:linear-gradient(135deg,#bfdbfe,#93c5fd);padding:20px;border-radius:12px;border:2px solid #3b82f6">
<h4 style="color:#1e3a8a;margin-bottom:10px">🛡️ Migliore Difesa</h4>
<p style="font-size:20px;font-weight:700;color:#1e40af;margin-bottom:8px">${bestDefense.name}</p>
<p style="font-size:32px;font-weight:900;color:#2563eb;margin:10px 0">${bestDefense.gamesLost} game subiti</p>
<p style="color:#1e40af;font-size:14px">Media: ${((bestDefense.gamesLost/(bestDefense.wins+bestDefense.losses))||0).toFixed(1)} game subiti/partita</p>
</div>
`;
      }
      
      if (bestDifference) {
        html += `
<div style="background:linear-gradient(135deg,#fde68a,#fbbf24);padding:20px;border-radius:12px;border:2px solid #f59e0b">
<h4 style="color:#92400e;margin-bottom:10px">⭐ Migliore Differenza</h4>
<p style="font-size:20px;font-weight:700;color:#78350f;margin-bottom:8px">${bestDifference.name}</p>
<p style="font-size:32px;font-weight:900;color:#d97706;margin:10px 0">+${bestDifference.gamesWon-bestDifference.gamesLost}</p>
<p style="color:#78350f;font-size:14px">${bestDifference.gamesWon} game vinti - ${bestDifference.gamesLost} subiti</p>
</div>
`;
      }
      
      if (mostWins) {
        html += `
<div style="background:linear-gradient(135deg,#c7d2fe,#a5b4fc);padding:20px;border-radius:12px;border:2px solid #6366f1">
<h4 style="color:#312e81;margin-bottom:10px">💪 Più Vittorie</h4>
<p style="font-size:20px;font-weight:700;color:#3730a3;margin-bottom:8px">${mostWins.name}</p>
<p style="font-size:32px;font-weight:900;color:#4f46e5;margin:10px 0">${mostWins.wins} vittorie</p>
<p style="color:#3730a3;font-size:14px">${mostWins.wins+mostWins.losses} partite • ${mostWins.points} punti</p>
</div>
`;
      }
      
      html += `
</div>
</div>
`;
    }

    // SITUAZIONI PARTICOLARI
    const unbeaten = allTeams.filter(t => t.wins > 0 && t.losses === 0);
    const struggling = allTeams.filter(t => t.losses > 0 && t.wins === 0).sort((a,b) => b.losses - a.losses);
    
    if (unbeaten.length > 0 || struggling.length > 0) {
      html += `
<div class="section">
<div class="section-title">📋 SITUAZIONI PARTICOLARI</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
`;
      
      html += `
<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);padding:20px;border-radius:12px;border:2px solid #10b981">
<h4 style="color:#065f46;margin-bottom:15px">✨ Squadre Imbattute (${unbeaten.length})</h4>
${unbeaten.length > 0 ? unbeaten.map(t => `
<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:6px;margin:8px 0;display:flex;justify-content:space-between">
<span style="font-weight:700;color:#064e3b">${t.name}</span>
<span style="color:#065f46;font-weight:700">${t.wins}V - 0P</span>
</div>
`).join('') : '<p style="color:#065f46">Nessuna squadra imbattuta</p>'}
</div>
`;

      html += `
<div style="background:linear-gradient(135deg,#fecaca,#fca5a5);padding:20px;border-radius:12px;border:2px solid #ef4444">
<h4 style="color:#991b1b;margin-bottom:15px">⚠️ In Difficoltà (${struggling.length})</h4>
${struggling.length > 0 ? struggling.map(t => `
<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:6px;margin:8px 0;display:flex;justify-content:space-between">
<span style="font-weight:700;color:#7f1d1d">${t.name}</span>
<span style="color:#991b1b;font-weight:700">0V - ${t.losses}P</span>
</div>
`).join('') : '<p style="color:#991b1b">Tutte le squadre hanno vinto almeno una partita</p>'}
</div>
`;
      
      html += `
</div>
</div>
`;
    }

    // RECORD PARTITE
    if (matches.length > 0) {
      const highestScore = matches.reduce((max, m) => {
        const total = m.score1 + m.score2;
        const maxTotal = max.score1 + max.score2;
        return total > maxTotal ? m : max;
      });
      const lowestScore = matches.reduce((min, m) => {
        const total = m.score1 + m.score2;
        const minTotal = min.score1 + min.score2;
        return total < minTotal ? m : min;
      });
      const biggestWin = matches.reduce((max, m) => {
        const diff = Math.abs(m.score1 - m.score2);
        const maxDiff = Math.abs(max.score1 - max.score2);
        return diff > maxDiff ? m : max;
      });
      const closestMatch = matches.reduce((min, m) => {
        const diff = Math.abs(m.score1 - m.score2);
        const minDiff = Math.abs(min.score1 - min.score2);
        return diff < minDiff ? m : min;
      });
      
      html += `
<div class="section">
<div class="section-title">🎯 RECORD PARTITE</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
<div style="background:linear-gradient(135deg,#fef3c7,#fde047);padding:20px;border-radius:12px;border:2px solid #eab308">
<h4 style="color:#854d0e;margin-bottom:10px">🔥 Più Game in Partita</h4>
<p style="font-weight:700;color:#713f12;margin-bottom:8px">${highestScore.team1} vs ${highestScore.team2}</p>
<p style="font-size:32px;font-weight:900;color:#ca8a04;margin:10px 0">${highestScore.score1+highestScore.score2} game</p>
<p style="color:#713f12;font-size:14px">${highestScore.score1}-${highestScore.score2} • ${highestScore.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
<div style="background:linear-gradient(135deg,#ddd6fe,#c4b5fd);padding:20px;border-radius:12px;border:2px solid #a78bfa">
<h4 style="color:#5b21b6;margin-bottom:10px">⚡ Meno Game in Partita</h4>
<p style="font-weight:700;color:#6b21a8;margin-bottom:8px">${lowestScore.team1} vs ${lowestScore.team2}</p>
<p style="font-size:32px;font-weight:900;color:#7c3aed;margin:10px 0">${lowestScore.score1+lowestScore.score2} game</p>
<p style="color:#6b21a8;font-size:14px">${lowestScore.score1}-${lowestScore.score2} • ${lowestScore.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
<div style="background:linear-gradient(135deg,#fecdd3,#fda4af);padding:20px;border-radius:12px;border:2px solid #f43f5e">
<h4 style="color:#881337;margin-bottom:10px">💥 Vittoria Più Larga</h4>
<p style="font-weight:700;color:#9f1239;margin-bottom:8px">${biggestWin.winner}</p>
<p style="font-size:32px;font-weight:900;color:#e11d48;margin:10px 0">+${Math.abs(biggestWin.score1-biggestWin.score2)} game</p>
<p style="color:#9f1239;font-size:14px">${biggestWin.team1} ${biggestWin.score1}-${biggestWin.score2} ${biggestWin.team2}</p>
</div>
<div style="background:linear-gradient(135deg,#e0e7ff,#c7d2fe);padding:20px;border-radius:12px;border:2px solid #818cf8">
<h4 style="color:#3730a3;margin-bottom:10px">🎲 Partita Più Equilibrata</h4>
<p style="font-weight:700;color:#4338ca;margin-bottom:8px">${closestMatch.team1} vs ${closestMatch.team2}</p>
<p style="font-size:32px;font-weight:900;color:#6366f1;margin:10px 0">${Math.abs(closestMatch.score1-closestMatch.score2)} game diff</p>
<p style="color:#4338ca;font-size:14px">${closestMatch.score1}-${closestMatch.score2} • ${closestMatch.girone==='girone1'?'Girone 1':'Girone 2'}</p>
</div>
</div>
</div>
`;
    }

    // CLASSIFICHE GIRONI
    html += `
<div class="section">
<div class="section-title">📈 PANORAMICA GENERALE</div>
<div class="stat-grid">
<div class="stat-box">
<div class="stat-label">Partite Totali</div>
<div class="stat-value">${matches.length}</div>
<div class="stat-label">su 30 (${((matches.length/30)*100).toFixed(0)}%)</div>
</div>
<div class="stat-box">
<div class="stat-label">Game Totali</div>
<div class="stat-value">${totalGames}</div>
</div>
<div class="stat-box">
<div class="stat-label">Media Game/Partita</div>
<div class="stat-value">${matches.length>0?(totalGames/matches.length).toFixed(1):'0'}</div>
</div>
<div class="stat-box">
<div class="stat-label">Girone 1</div>
<div class="stat-value">${girone1Matches.length}</div>
<div class="stat-label">${((girone1Matches.length/15)*100).toFixed(0)}%</div>
</div>
<div class="stat-box">
<div class="stat-label">Girone 2</div>
<div class="stat-value">${girone2Matches.length}</div>
<div class="stat-label">${((girone2Matches.length/15)*100).toFixed(0)}%</div>
</div>
</div>
</div>
`;

    // CLASSIFICHE GIRONI
    html += `
<div class="section">
<div class="section-title">🥇 CLASSIFICHE GIRONI</div>
<h3 style="color:#667eea;margin:20px 0 10px 0">GIRONE 1</h3>
<table>
<tr><th>Pos</th><th>Squadra</th><th>PG</th><th>V</th><th>P</th><th>GF</th><th>GS</th><th>+/-</th><th>Pt</th></tr>
`;
    calculateStandings(teams.girone1).forEach((t, i) => {
      const d = t.gamesWon - t.gamesLost;
      const pg = t.wins + t.losses;
      html += `<tr class="${i < 2 ? 'highlight' : ''}"><td><b>${i + 1}°</b></td><td><b>${t.name}</b></td><td>${pg}</td><td style="color:#10b981;font-weight:700">${t.wins}</td><td style="color:#ef4444;font-weight:700">${t.losses}</td><td>${t.gamesWon}</td><td>${t.gamesLost}</td><td><b style="color:${d >= 0 ? '#10b981' : '#ef4444'}">${d > 0 ? '+' : ''}${d}</b></td><td><b style="font-size:16px;color:#667eea">${t.points}</b></td></tr>`;
    });
    html += `
</table>
<h3 style="color:#667eea;margin:30px 0 10px 0">GIRONE 2</h3>
<table>
<tr><th>Pos</th><th>Squadra</th><th>PG</th><th>V</th><th>P</th><th>GF</th><th>GS</th><th>+/-</th><th>Pt</th></tr>
`;
    calculateStandings(teams.girone2).forEach((t, i) => {
      const d = t.gamesWon - t.gamesLost;
      const pg = t.wins + t.losses;
      html += `<tr class="${i < 2 ? 'highlight' : ''}"><td><b>${i + 1}°</b></td><td><b>${t.name}</b></td><td>${pg}</td><td style="color:#10b981;font-weight:700">${t.wins}</td><td style="color:#ef4444;font-weight:700">${t.losses}</td><td>${t.gamesWon}</td><td>${t.gamesLost}</td><td><b style="color:${d >= 0 ? '#10b981' : '#ef4444'}">${d > 0 ? '+' : ''}${d}</b></td><td><b style="font-size:16px;color:#667eea">${t.points}</b></td></tr>`;
    });
    html += `
</table>
</div>
`;

    // RISULTATI PARTITE GIRONI
    if (matches.length > 0) {
      html += `
<div class="section">
<div class="section-title">⚡ RISULTATI PARTITE GIRONI (${matches.length})</div>
`;
      matches.forEach(m => {
        const dur = m.duration ? `${Math.floor(m.duration / 60)}:${(m.duration % 60).toString().padStart(2, '0')}` : 'N/A';
        const girone = m.girone === 'girone1' ? 'Girone 1' : 'Girone 2';
        html += `
<div style="background:#f8f9ff;padding:15px;margin:10px 0;border-radius:8px;border-left:4px solid #667eea">
<div style="display:flex;justify-content:space-between;margin-bottom:8px">
<span style="font-size:13px;color:#666;font-weight:600">${girone}</span>
<span style="font-size:13px;color:#667eea;font-weight:700">⏱️ ${dur}</span>
</div>
<div style="font-size:18px;font-weight:700">
${m.winner === m.team1 ? '🏆 ' : ''}${m.team1} <span style="color:#667eea;font-size:22px">${m.score1} - ${m.score2}</span> ${m.winner === m.team2 ? '🏆 ' : ''}${m.team2}
</div>
</div>
`;
      });
      html += `</div>`;
    }

    // CLASSIFICA GENERALE FINALE
    html += `
<div class="section">
<div class="section-title">📋 CLASSIFICA GENERALE FINALE</div>
<div style="background:#fff3cd;padding:12px;border-radius:8px;border:2px solid #ffc107;margin-bottom:15px;text-align:center">
<strong style="color:#856404">⚠️ Solo per fini statistici - Le qualificazioni si basano sulle classifiche dei singoli gironi</strong>
</div>
<table>
<tr><th>Pos</th><th>Squadra</th><th>Girone</th><th>PG</th><th>V</th><th>P</th><th>GF</th><th>GS</th><th>+/-</th><th>Pt</th><th>%V</th></tr>
`;
    sortedByPoints.forEach((t, i) => {
      const g = teams.girone1.includes(t) ? '1' : '2';
      const d = t.gamesWon - t.gamesLost;
      const pg = t.wins + t.losses;
      const perc = pg > 0 ? ((t.wins / pg) * 100).toFixed(0) : 0;
      html += `<tr><td><b>${i + 1}°</b></td><td><b>${t.name}</b></td><td><span style="background:${g === '1' ? '#fef3c7' : '#dbeafe'};color:${g === '1' ? '#92400e' : '#1e3a8a'};padding:4px 10px;border-radius:12px;font-weight:700">G${g}</span></td><td>${pg}</td><td style="color:#10b981;font-weight:700">${t.wins}</td><td style="color:#ef4444;font-weight:700">${t.losses}</td><td style="color:#10b981">${t.gamesWon}</td><td style="color:#ef4444">${t.gamesLost}</td><td><b style="color:${d >= 0 ? '#10b981' : '#ef4444'}">${d > 0 ? '+' : ''}${d}</b></td><td><b style="font-size:16px;color:#667eea">${t.points}</b></td><td>${perc}%</td></tr>`;
    });
    html += `
</table>
</div>
`;

    // FASE FINALE
    const semi1 = finalMatches.find(m => m.type === 'semifinale1');
    const semi2 = finalMatches.find(m => m.type === 'semifinale2');
    
    if (semi1 || semi2 || finaleResult) {
      html += `
<div class="section">
<div class="section-title">🏆 FASE FINALE</div>
`;
      
      if (semi1) {
        html += `
<div style="background:linear-gradient(135deg,#fef3c7,#fcd34d);padding:20px;border-radius:12px;margin:15px 0;border:2px solid #f59e0b">
<h3 style="color:#92400e;margin-bottom:15px">⚔️ SEMIFINALE 1</h3>
<div style="font-size:20px;font-weight:700;text-align:center;color:#1a1a1a">
${semi1.winner === semi1.team1 ? '🏆 ' : ''}${semi1.team1} <span style="color:#b45309;font-size:28px">${semi1.score1} - ${semi1.score2}</span> ${semi1.winner === semi1.team2 ? '🏆 ' : ''}${semi1.team2}
</div>
${semi1.duration ? `<p style="text-align:center;color:#92400e;margin-top:10px">⏱️ Durata: ${Math.floor(semi1.duration / 60)}:${(semi1.duration % 60).toString().padStart(2, '0')}</p>` : ''}
</div>
`;
      }
      
      if (semi2) {
        html += `
<div style="background:linear-gradient(135deg,#dbeafe,#60a5fa);padding:20px;border-radius:12px;margin:15px 0;border:2px solid #3b82f6">
<h3 style="color:#1e3a8a;margin-bottom:15px">⚔️ SEMIFINALE 2</h3>
<div style="font-size:20px;font-weight:700;text-align:center;color:#1a1a1a">
${semi2.winner === semi2.team1 ? '🏆 ' : ''}${semi2.team1} <span style="color:#2563eb;font-size:28px">${semi2.score1} - ${semi2.score2}</span> ${semi2.winner === semi2.team2 ? '🏆 ' : ''}${semi2.team2}
</div>
${semi2.duration ? `<p style="text-align:center;color:#1e3a8a;margin-top:10px">⏱️ Durata: ${Math.floor(semi2.duration / 60)}:${(semi2.duration % 60).toString().padStart(2, '0')}</p>` : ''}
</div>
`;
      }
      
      if (finaleResult) {
        html += `
<div style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:30px;border-radius:15px;margin:20px 0;border:3px solid #e11d48;text-align:center">
<h3 style="color:white;font-size:28px;margin-bottom:20px">🏆 FINALE 🏆</h3>
<div style="font-size:24px;font-weight:700;color:white">
${finaleResult.winner === finaleResult.team1 ? '👑 ' : ''}${finaleResult.team1} <span style="font-size:36px">${finaleResult.score1} - ${finaleResult.score2}</span> ${finaleResult.winner === finaleResult.team2 ? '👑 ' : ''}${finaleResult.team2}
</div>
${finaleResult.duration ? `<p style="color:white;margin-top:15px;font-size:16px">⏱️ Durata: ${Math.floor(finaleResult.duration / 60)}:${(finaleResult.duration % 60).toString().padStart(2, '0')}</p>` : ''}
<div style="margin-top:25px;padding:20px;background:rgba(255,255,255,0.2);border-radius:10px">
<p style="color:white;font-size:32px;font-weight:900;margin:0">🎉 ${finaleResult.winner} 🎉</p>
<p style="color:white;font-size:18px;margin-top:10px">CAMPIONE DEL TORNEO</p>
</div>
</div>
`;
      }
      
      html += `</div>`;
    }

    html += `
<div style="text-align:center;margin-top:40px;padding:20px;color:#666;border-top:2px solid #ddd">
<p>Report generato: ${reportDate}</p>
<p style="margin-top:10px;font-weight:700;color:#667eea;font-size:18px">ACOP Padel Indoor - Gestionale Torneo</p>
<p style="margin-top:5px">by AATech - antonio.astuti@gmail.com</p>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-completo-acop-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccessMessage('📄 REPORT COMPLETO GENERATO!\n\nFile HTML scaricato con:\n✓ Statistiche complete\n✓ Risultati gironi\n✓ Semifinali e Finale\n✓ Vincitore torneo\n\nPer PDF: Apri e usa Stampa > Salva come PDF');
    setShowSuccessModal(true);
  };

  const downloadSimpleCalendar = () => {
    let htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Calendario Semplificato - Torneo Padel ACOP</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: white;
        }
        .header { 
            text-align: center; 
            margin-bottom: 20px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
        }
        .header h1 { 
            font-size: 24px;
            margin-bottom: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th, td {
            border: 2px solid #000;
            padding: 8px 12px;
            text-align: center;
        }
        th {
            background-color: #e0e0e0;
            font-weight: bold;
            font-size: 14px;
        }
        td {
            font-size: 13px;
        }
        .partita-cell {
            text-align: left;
            font-weight: 600;
        }
        .girone-header {
            background-color: #c0c0c0;
            font-weight: bold;
            font-size: 16px;
        }
        .turno-cell {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .campo-cell {
            font-weight: bold;
            font-size: 11px;
        }
        @media print {
            body { padding: 10px; }
            @page { size: A4 portrait; margin: 1cm; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CALENDARIO TORNEO PADEL - ACOP INDOOR</h1>
        <p>Sistema Killer Point - 3 Campi (A, B, C)</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th style="width: 8%;">TURNO</th>
                <th style="width: 8%;">CAMPO</th>
                <th style="width: 44%;">PARTITA DISPUTATE</th>
                <th style="width: 8%;">GIRONE</th>
                <th style="width: 16%;">PUNTI</th>
                <th style="width: 16%;">GAME</th>
            </tr>
        </thead>
        <tbody>
`;

    scheduleWithStatus.forEach((turno, turnoIdx) => {
      turno.partite.forEach((partita, partitaIdx) => {
        const girone = partita.girone === 'girone1' ? '1' : '2';
        const showTurno = partitaIdx === 0;
        
        htmlContent += `
            <tr>
                ${showTurno ? `<td rowspan="3" class="turno-cell">${turno.numero}</td>` : ''}
                <td class="campo-cell">${partita.campo}</td>
                <td class="partita-cell">${partita.team1} - ${partita.team2}</td>
                <td>${girone}</td>
                <td></td>
                <td></td>
            </tr>
`;
      });
    });

    htmlContent += `
        </tbody>
    </table>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendario-semplificato-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printCalendar = () => {
    // Genera HTML completo per il calendario
    let htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendario Torneo Padel ACOP</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: white;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #5b21b6; 
            margin-bottom: 10px;
            font-size: 32px;
        }
        .header p { 
            color: #666; 
            font-size: 16px;
        }
        .legenda {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 10px;
        }
        .legenda-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
        }
        .legenda-box {
            width: 30px;
            height: 30px;
            border-radius: 5px;
            border: 2px solid #333;
        }
        .turno { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
            border: 3px solid #333;
            border-radius: 12px;
            padding: 20px;
            background: #fafafa;
        }
        .turno-header { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 20px;
            color: #1f2937;
            border-bottom: 2px solid #666;
            padding-bottom: 10px;
        }
        .partite-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px;
        }
        .partita { 
            border: 2px solid #333; 
            padding: 15px; 
            border-radius: 10px;
            background: white;
        }
        .partita.campo-a { background: #fee2e2; border-color: #dc2626; }
        .partita.campo-b { background: #dbeafe; border-color: #2563eb; }
        .partita.campo-c { background: #d1fae5; border-color: #059669; }
        .campo-header { 
            font-weight: bold; 
            font-size: 18px; 
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .girone-badge {
            font-size: 12px;
            padding: 3px 8px;
            border-radius: 12px;
            background: #fff;
            border: 1px solid #333;
        }
        .team { 
            margin: 10px 0; 
            font-size: 15px;
            font-weight: 600;
            padding: 8px;
            background: rgba(255,255,255,0.7);
            border-radius: 5px;
        }
        .vs { 
            text-align: center; 
            font-weight: bold; 
            margin: 8px 0;
            color: #666;
        }
        .risultato { 
            margin-top: 15px; 
            padding-top: 15px; 
            border-top: 2px dashed #999;
            text-align: center;
            font-weight: bold;
        }
        .risultato-line {
            font-size: 20px;
            margin-top: 8px;
        }
        @media print {
            body { padding: 15px; }
            .turno { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 ACOP Padel Indoor - Calendario Torneo</h1>
        <p>30 Partite totali su 3 Campi - Sistema Killer Point</p>
    </div>
    
    <div class="legenda">
        <div class="legenda-item">
            <div class="legenda-box" style="background: #fee2e2; border-color: #dc2626;"></div>
            <span>Campo A</span>
        </div>
        <div class="legenda-item">
            <div class="legenda-box" style="background: #dbeafe; border-color: #2563eb;"></div>
            <span>Campo B</span>
        </div>
        <div class="legenda-item">
            <div class="legenda-box" style="background: #d1fae5; border-color: #059669;"></div>
            <span>Campo C</span>
        </div>
    </div>
`;

    scheduleWithStatus.forEach(turno => {
      htmlContent += `
    <div class="turno">
        <div class="turno-header">TURNO ${turno.numero}</div>
        <div class="partite-grid">
`;
      
      turno.partite.forEach(partita => {
        const campoClass = `campo-${partita.campo.toLowerCase()}`;
        const girone = partita.girone === 'girone1' ? 'G1' : 'G2';
        
        htmlContent += `
            <div class="partita ${campoClass}">
                <div class="campo-header">
                    <span>Campo ${partita.campo}</span>
                    <span class="girone-badge">${girone}</span>
                </div>
                <div class="team">${partita.team1}</div>
                <div class="vs">VS</div>
                <div class="team">${partita.team2}</div>
                <div class="risultato">
                    <div>Risultato:</div>
                    <div class="risultato-line">___ - ___</div>
                </div>
            </div>
`;
      });
      
      htmlContent += `
        </div>
    </div>
`;
    });

    htmlContent += `
</body>
</html>
`;

    // Crea un Blob con il contenuto HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Crea un link temporaneo e clicca automaticamente per scaricare
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendario-torneo-padel-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getQualifiedTeams = () => {
    const g1 = calculateStandings(teams.girone1).slice(0, 2);
    const g2 = calculateStandings(teams.girone2).slice(0, 2);
    return { girone1: g1, girone2: g2 };
  };

  const qualified = getQualifiedTeams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-3 md:p-6 lg:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border border-white/20 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            {/* Logo e Titolo */}
            <div className="flex items-center gap-3 md:gap-4">
              <Trophy className="w-10 h-10 md:w-12 md:h-12 lg:w-10 lg:h-10 text-yellow-400 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-4xl lg:text-3xl font-bold text-white leading-tight">ACOP Padel Indoor</h1>
                  <span className="text-sm md:text-base bg-white/20 text-white/90 px-2 md:px-3 py-1 rounded-full border border-white/30">v4.5</span>
                </div>
                <p className="text-white/80 text-sm md:text-base">Torneo a Gironi</p>
                <p className="text-white/50 text-xs mt-0.5">by AATech - antonio.astuti@gmail.com</p>
              </div>
            </div>

            {/* Badge e Pulsanti - Allineati Orizzontalmente */}
            <div className="flex items-center gap-2">
              {/* Pulsante Refresh Manuale */}
              <button
                onClick={() => loadData(true)}
                className="bg-white/10 hover:bg-white/20 active:bg-white text-gray-900 p-3 md:p-3.5 rounded-lg transition-all border border-white/20 flex items-center justify-center min-w-[44px] min-h-[44px]"
                title="Aggiorna dati"
              >
                <svg 
                  className={`w-5 h-5 md:w-6 md:h-6 ${isSyncing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {/* Indicatore di sincronizzazione */}
              {isSyncing && (
                <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border bg-blue-500/20 text-blue-400 border-blue-400/50">
                  <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Sync</span>
                </div>
              )}
              
              {/* Indicatore di salvataggio */}
              {saveStatus && (
                <div className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${
                  saveStatus === 'saving' ? 'bg-blue-500/20 text-blue-400 border-blue-400/50' :
                  saveStatus === 'saved' ? 'bg-green-500/20 text-green-400 border-green-400/50' :
                  'bg-red-500/20 text-red-400 border-red-400/50'
                }`}>
                  {saveStatus === 'saving' && (
                    <>
                      <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && <span>✓</span>}
                  {saveStatus === 'error' && <span>⚠️</span>}
                </div>
              )}
              
              {/* Badge Ruolo - Sulla stessa riga dei pulsanti */}
              <div className="flex items-center gap-2 bg-white/10 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border border-white/20 min-h-[44px]">
                <span className="text-xs text-white/60 hidden lg:inline">Accesso:</span>
                <span className="text-sm md:text-base text-white font-bold whitespace-nowrap">
                  {userRole === 'organizer' ? (
                    <>
                      <span className="hidden sm:inline">👑 Organizzatore</span>
                      <span className="sm:hidden">👑 Org.</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">👤 Giocatore</span>
                      <span className="sm:hidden">👤 Gioc.</span>
                    </>
                  )}
                </span>
              </div>
              
              {/* Pulsante Reset - Solo Organizzatore - Stessa riga */}
              {userRole === 'organizer' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowResetModal(true);
                  }}
                  type="button"
                  className="bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/50 text-red-400 font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all border border-red-400/50 flex items-center gap-2 min-h-[44px]"
                  title="Reset completo del torneo"
                >
                  <Trash2 className="w-5 h-5 md:w-5 md:h-5" />
                  <span className="hidden lg:inline text-sm md:text-base">Reset</span>
                </button>
              )}
              
              {/* Pulsante Esci - Stessa riga */}
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/50 text-red-400 font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all border border-red-400/50 flex items-center gap-2 min-h-[44px]"
                title="Esci"
              >
                <LogOut className="w-5 h-5 md:w-5 md:h-5" />
                <span className="hidden lg:inline text-sm md:text-base">Esci</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 bg-white/10 backdrop-blur-lg rounded-xl p-2 md:p-3 shadow-lg">
          <button
            onClick={() => setActiveTab('gironi')}
            className={`flex-1 min-w-[100px] py-3 md:py-4 rounded-lg font-semibold transition-all text-sm md:text-base min-h-[48px] ${
              activeTab === 'gironi' 
                ? 'bg-white text-purple-900 shadow-lg' 
                : 'text-white hover:bg-white/20 active:bg-white/30'
            }`}
          >
            <Users className="inline w-5 h-5 md:w-6 md:h-6 mr-2" />
            <span className="hidden sm:inline">Gironi e Classifica</span>
            <span className="sm:hidden">Gironi</span>
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className={`flex-1 min-w-[100px] py-3 md:py-4 rounded-lg font-semibold transition-all text-sm md:text-base min-h-[48px] ${
              activeTab === 'calendario' 
                ? 'bg-white text-purple-900 shadow-lg' 
                : 'text-white hover:bg-white/20 active:bg-white/30'
            }`}
          >
            <ClipboardList className="inline w-5 h-5 md:w-6 md:h-6 mr-2" />
            <span className="hidden sm:inline">Calendario</span>
            <span className="sm:hidden">Calendario</span>
          </button>
          <button
            onClick={() => setActiveTab('risultati')}
            className={`flex-1 min-w-[100px] py-3 md:py-4 rounded-lg font-semibold transition-all text-sm md:text-base min-h-[48px] ${
              activeTab === 'risultati' 
                ? 'bg-white text-purple-900 shadow-lg' 
                : 'text-white hover:bg-white/20 active:bg-white/30'
            }`}
          >
            <Calendar className="inline w-5 h-5 md:w-6 md:h-6 mr-2" />
            <span className="hidden sm:inline">Risultati</span>
            <span className="sm:hidden">Risultati</span>
          </button>
          <button
            onClick={() => setActiveTab('statistiche')}
            className={`flex-1 min-w-[100px] py-3 md:py-4 rounded-lg font-semibold transition-all text-sm md:text-base min-h-[48px] ${
              activeTab === 'statistiche' 
                ? 'bg-white text-purple-900 shadow-lg' 
                : 'text-white hover:bg-white/20 active:bg-white/30'
            }`}
          >
            <BarChart3 className="inline w-5 h-5 md:w-6 md:h-6 mr-2" />
            <span className="hidden sm:inline">Statistiche</span>
            <span className="sm:hidden">Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('finali')}
            className={`flex-1 min-w-[100px] py-3 md:py-4 rounded-lg font-semibold transition-all text-sm md:text-base min-h-[48px] ${
              activeTab === 'finali' 
                ? 'bg-white text-purple-900 shadow-lg' 
                : 'text-white hover:bg-white/20 active:bg-white/30'
            }`}
          >
            <Award className="inline w-5 h-5 md:w-6 md:h-6 mr-2" />
            <span className="hidden sm:inline">Finali</span>
            <span className="sm:hidden">Finali</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'gironi' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/20 shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-base md:text-lg">1</div>
                GIRONE 1
              </h2>
              {(() => {
                const girone1Matches = matches.filter(m => m.girone === 'girone1').length;
                const totalGirone1 = 15;
                const percentageGirone1 = ((girone1Matches / totalGirone1) * 100).toFixed(0);
                return (
                  <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                    <p className="text-white/90 text-sm md:text-base">
                      <span className="font-bold text-yellow-400">{girone1Matches}</span> partite giocate su <span className="font-bold">{totalGirone1}</span> ({percentageGirone1}%)
                    </p>
                  </div>
                );
              })()}
              <div className="overflow-hidden">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-2 text-base md:text-lg w-10">#</th>
                      <th className="text-left py-3 px-3 text-base md:text-lg">Squadra</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">PG</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">V</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">P</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">GF</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">GS</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-16">+/-</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">Pt</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-16">%V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateStandings(teams.girone1).map((team, idx) => {
                      const totalMatches = team.wins + team.losses;
                      const winPercentage = totalMatches > 0 ? ((team.wins / totalMatches) * 100).toFixed(0) : 0;
                      return (
                        <tr key={team.id} className={`border-b border-white/10 ${idx < 2 ? 'bg-green-500/20' : ''}`}>
                          <td className="py-3 px-1 font-bold text-base md:text-lg">{idx + 1}</td>
                          <td className="py-3 px-2 text-base md:text-lg">
                            {editingTeam === team.id && userRole === 'organizer' ? (
                              <input
                                type="text"
                                value={tempTeamName}
                                onChange={(e) => setTempTeamName(e.target.value)}
                                onBlur={() => updateTeamName('girone1', team.id, tempTeamName)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    updateTeamName('girone1', team.id, tempTeamName);
                                  }
                                }}
                                autoFocus
                                className="bg-white/20 text-white px-2 py-1 rounded border border-white/30 w-full"
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  if (userRole === 'organizer') {
                                    setEditingTeam(team.id);
                                    setTempTeamName(team.name);
                                  }
                                }}
                                className={`font-semibold ${userRole === 'organizer' ? 'cursor-pointer hover:text-yellow-400' : ''} transition-colors`}
                                title={userRole === 'organizer' ? 'Clicca per modificare' : ''}
                              >
                                {team.name}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-3 px-1 text-base md:text-lg text-blue-400 font-semibold">{totalMatches}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg">{team.wins}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg">{team.losses}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg text-green-400">{team.gamesWon}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg text-red-400">{team.gamesLost}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg font-bold">
                            <span className={team.gamesWon - team.gamesLost >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {team.gamesWon - team.gamesLost > 0 ? '+' : ''}{team.gamesWon - team.gamesLost}
                            </span>
                          </td>
                          <td className="text-center py-3 px-1 font-bold text-yellow-400 text-base md:text-lg">{team.points}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg">{winPercentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-white/60 text-xs mt-3 italic">
                {userRole === 'organizer' ? '💡 Clicca sul nome per modificarlo' : '👁️ Modalità visualizzazione'}
              </p>
            </div>

            {/* Girone 2 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/20 shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center font-bold text-base md:text-lg">2</div>
                GIRONE 2
              </h2>
              {(() => {
                const girone2Matches = matches.filter(m => m.girone === 'girone2').length;
                const totalGirone2 = 15;
                const percentageGirone2 = ((girone2Matches / totalGirone2) * 100).toFixed(0);
                return (
                  <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-3 mb-4">
                    <p className="text-white/90 text-sm md:text-base">
                      <span className="font-bold text-cyan-400">{girone2Matches}</span> partite giocate su <span className="font-bold">{totalGirone2}</span> ({percentageGirone2}%)
                    </p>
                  </div>
                );
              })()}
              <div className="overflow-hidden">
                <table className="w-full text-white min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-2 text-base md:text-lg w-10">#</th>
                      <th className="text-left py-3 px-3 text-base md:text-lg">Squadra</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">PG</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">V</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">P</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">GF</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">GS</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-16">+/-</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-14">Pt</th>
                      <th className="text-center py-3 px-2 text-base md:text-lg w-16">%V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateStandings(teams.girone2).map((team, idx) => {
                      const totalMatches = team.wins + team.losses;
                      const winPercentage = totalMatches > 0 ? ((team.wins / totalMatches) * 100).toFixed(0) : 0;
                      return (
                        <tr key={team.id} className={`border-b border-white/10 ${idx < 2 ? 'bg-green-500/20' : ''}`}>
                          <td className="py-3 px-1 font-bold text-base md:text-lg">{idx + 1}</td>
                          <td className="py-3 px-2 text-base md:text-lg">
                            {editingTeam === team.id && userRole === 'organizer' ? (
                              <input
                                type="text"
                                value={tempTeamName}
                                onChange={(e) => setTempTeamName(e.target.value)}
                                onBlur={() => updateTeamName('girone2', team.id, tempTeamName)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    updateTeamName('girone2', team.id, tempTeamName);
                                  }
                                }}
                                autoFocus
                                className="bg-white/20 text-white px-2 py-1 rounded border border-white/30 w-full"
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  if (userRole === 'organizer') {
                                    setEditingTeam(team.id);
                                    setTempTeamName(team.name);
                                  }
                                }}
                                className={`font-semibold ${userRole === 'organizer' ? 'cursor-pointer hover:text-cyan-400' : ''} transition-colors`}
                                title={userRole === 'organizer' ? 'Clicca per modificare' : ''}
                              >
                                {team.name}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-3 px-1 text-base md:text-lg text-blue-400 font-semibold">{totalMatches}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg">{team.wins}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg">{team.losses}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg text-green-400">{team.gamesWon}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg text-red-400">{team.gamesLost}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg font-bold">
                            <span className={team.gamesWon - team.gamesLost >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {team.gamesWon - team.gamesLost > 0 ? '+' : ''}{team.gamesWon - team.gamesLost}
                            </span>
                          </td>
                          <td className="text-center py-3 px-1 font-bold text-yellow-400 text-base md:text-lg">{team.points}</td>
                          <td className="text-center py-3 px-1 text-base md:text-lg">{winPercentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-white/60 text-xs mt-3 italic">
                {userRole === 'organizer' ? '💡 Clicca sul nome per modificarlo' : '👁️ Modalità visualizzazione'}
              </p>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'calendario' && (
          <div className="space-y-6">
            {/* Gestione Presenze */}
            {userRole === 'organizer' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">👥 Gestione Presenze</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const allTeams = new Set([...teams.girone1, ...teams.girone2].map(t => t.name));
                      setPresentTeams(allTeams);
                      saveImmediately({ presentTeams: allTeams });
                    }}
                    className="bg-green-500/20 hover:bg-green-500/40 text-green-400 px-4 py-2 rounded-lg transition-all border border-green-400/50 font-semibold"
                  >
                    Tutti Presenti
                  </button>
                  <button
                    onClick={() => {
                      const emptySet = new Set();
                      setPresentTeams(emptySet);
                      saveImmediately({ presentTeams: emptySet });
                    }}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-lg transition-all border border-red-400/50 font-semibold"
                  >
                    Azzera
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-3">Girone 1</h3>
                  <div className="space-y-2">
                    {teams.girone1.map(team => (
                      <label key={team.id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-lg cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={presentTeams.has(team.name)}
                          onChange={() => toggleTeamPresence(team.name)}
                          className="w-5 h-5 cursor-pointer"
                        />
                        <span className={`font-semibold ${presentTeams.has(team.name) ? 'text-green-400' : 'text-white/60'}`}>
                          {team.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-cyan-400 mb-3">Girone 2</h3>
                  <div className="space-y-2">
                    {teams.girone2.map(team => (
                      <label key={team.id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-lg cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={presentTeams.has(team.name)}
                          onChange={() => toggleTeamPresence(team.name)}
                          className="w-5 h-5 cursor-pointer"
                        />
                        <span className={`font-semibold ${presentTeams.has(team.name) ? 'text-green-400' : 'text-white/60'}`}>
                          {team.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className="text-white font-semibold">Mostra solo partite disponibili</span>
                </label>
                <div className="text-white/80">
                  <span className="font-bold text-green-400">{presentTeams.size}</span> / 12 squadre presenti
                </div>
              </div>
            </div>
            )}

            {/* Partite Disponibili Ora */}
            {(presentTeams.size > 0 || ongoingMatches.length > 0) && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-400/50">
                {/* Spiegazione */}
                <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-2">ℹ️ Come funziona?</h3>
                  <div className="text-white/90 text-sm space-y-1">
                    <p>• <strong>Partite Disponibili:</strong> squadre presenti e libere (non in campo)</p>
                    <p>• <strong>Turni di Gioco:</strong> calendario completo per organizzazione</p>
                    <p>• <strong>Massimo 3 partite:</strong> una per ogni campo (A, B, C)</p>
                    <p>• <strong>Squadre occupate:</strong> non possono giocare altre partite fino a fine match</p>
                  </div>
                </div>

                {ongoingMatches.length > 0 && (
                  <>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6">🔥 Partite In Corso ({ongoingMatches.length}/3)</h2>
                    <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                      {ongoingMatches.map((partita, idx) => {
                        const campoColor = 
                          partita.campo === 'A' ? 'from-red-500 to-pink-500' :
                          partita.campo === 'B' ? 'from-blue-500 to-cyan-500' :
                          'from-green-500 to-emerald-500';
                        const duration = getMatchDuration(partita);
                        const isFinishing = finishingMatch === partita;
                        
                        // Trova le info della partita
                        const teamPlayedCount = {};
                        [...teams.girone1, ...teams.girone2].forEach(team => {
                          if (team && team.name) {
                            teamPlayedCount[team.name] = team.wins + team.losses;
                          }
                        });
                        const team1Played = teamPlayedCount[partita.team1] || 0;
                        const team2Played = teamPlayedCount[partita.team2] || 0;
                        
                        const matchToTurno = {};
                        scheduleWithStatus.forEach(turno => {
                          turno.partite?.forEach(p => {
                            if (p) {
                              const key = `${p.girone}-${p.team1}-${p.team2}`;
                              matchToTurno[key] = turno.numero;
                            }
                          });
                        });
                        const matchKey = `${partita.girone}-${partita.team1}-${partita.team2}`;
                        const turnoNumber = matchToTurno[matchKey] || '?';
                        const gironeNumber = partita.girone === 'girone1' ? '1' : '2';
                        
                        return (
                          <div 
                            key={idx}
                            className={`bg-gradient-to-br ${campoColor} rounded-xl p-4 md:p-5 border-2 ${
                              isFinishing ? 'border-white shadow-2xl' : 'border-yellow-400 shadow-lg animate-pulse'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-white text-base md:text-lg">
                                Campo {partita.campo} - Turno {turnoNumber} - Girone {gironeNumber}
                              </span>
                              <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-yellow-500/30 text-yellow-300 font-bold border border-yellow-400 whitespace-nowrap ml-2">
                                ⏱️ {formatTimeWithSeconds(duration.minutes, duration.seconds)}
                              </span>
                            </div>
                            
                            {isFinishing ? (
                              <div className="space-y-3">
                                <div className="bg-black/20 p-3 rounded">
                                  <div className="text-white font-semibold text-sm md:text-base">
                                    {partita.team1} - {team1Played} {team1Played === 1 ? 'Partita giocata' : 'Partite giocate'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={quickResult.score1}
                                    onChange={(e) => setQuickResult({ ...quickResult, score1: e.target.value })}
                                    className="flex-1 bg-white text-gray-900 text-center font-bold text-xl rounded-lg px-3 py-3 border-2 border-gray-300 shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="0"
                                    autoFocus
                                  />
                                  <span className="text-white font-bold text-xl">-</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={quickResult.score2}
                                    onChange={(e) => setQuickResult({ ...quickResult, score2: e.target.value })}
                                    className="flex-1 bg-white text-gray-900 text-center font-bold text-xl rounded-lg px-3 py-3 border-2 border-gray-300 shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="0"
                                  />
                                </div>
                                <div className="bg-black/20 p-3 rounded">
                                  <div className="text-white font-semibold text-sm md:text-base">
                                    {partita.team2} - {team2Played} {team2Played === 1 ? 'Partita giocata' : 'Partite giocate'}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveQuickResult(partita)}
                                    className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-3 rounded-lg transition-all text-sm md:text-base"
                                  >
                                    ✓ Salva
                                  </button>
                                  <button
                                    onClick={() => {
                                      setFinishingMatch(null);
                                      setQuickResult({ score1: '', score2: '' });
                                    }}
                                    className="flex-1 bg-red-500/80 hover:bg-red-600 active:bg-red-700 text-white font-bold py-3 rounded-lg transition-all text-sm md:text-base"
                                  >
                                    ✕ Annulla
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <div className="bg-black/20 p-3 rounded">
                                    <div className="text-white font-semibold text-sm md:text-base">
                                      {partita.team1} - {team1Played} {team1Played === 1 ? 'Partita giocata' : 'Partite giocate'}
                                    </div>
                                  </div>
                                  <div className="text-center text-white/90 font-bold text-base">VS</div>
                                  <div className="bg-black/20 p-3 rounded">
                                    <div className="text-white font-semibold text-sm md:text-base">
                                      {partita.team2} - {team2Played} {team2Played === 1 ? 'Partita giocata' : 'Partite giocate'}
                                    </div>
                                  </div>
                                </div>
                                {userRole === 'organizer' && (
                                  <button
                                    onClick={() => {
                                      setFinishingMatch(partita);
                                      setQuickResult({ score1: '', score2: '' });
                                    }}
                                    className="w-full mt-3 bg-white/30 hover:bg-white/40 active:bg-white/50 text-white font-bold py-3 rounded-lg transition-all border-2 border-gray-400 text-sm md:text-base"
                                  >
                                    🏁 Partita Finita
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                
                {presentTeams.size > 0 && userRole === 'organizer' && (
                  <>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 md:mb-3">⚡ Partite Disponibili</h2>
                    <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                      Solo partite con squadre presenti e libere, ordinate per bilanciamento
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                      {(() => {
                        // Calcola quante partite ha giocato ogni squadra
                        const teamPlayedCount = {};
                        [...teams.girone1, ...teams.girone2].forEach(team => {
                          if (team && team.name) {
                            teamPlayedCount[team.name] = team.wins + team.losses;
                          }
                        });
                        
                        // Mappa per trovare il numero del turno di ogni partita
                        const matchToTurno = {};
                        scheduleWithStatus.forEach(turno => {
                          turno.partite?.forEach(partita => {
                            if (partita) {
                              const key = `${partita.girone}-${partita.team1}-${partita.team2}`;
                              matchToTurno[key] = turno.numero;
                            }
                          });
                        });
                        
                        return scheduleWithStatus
                          .flatMap(turno => turno.partite || [])
                          .filter(partita => 
                            partita &&
                            !partita.played && 
                            !isMatchOngoing(partita) && 
                            isMatchAvailable(partita) &&
                            !isTeamPlaying(partita.team1) &&
                            !isTeamPlaying(partita.team2)
                          )
                          // Ordina per bilanciamento: priorità a squadre con meno partite giocate
                          .sort((a, b) => {
                            const aPriority = (teamPlayedCount[a.team1] || 0) + (teamPlayedCount[a.team2] || 0);
                            const bPriority = (teamPlayedCount[b.team1] || 0) + (teamPlayedCount[b.team2] || 0);
                            return aPriority - bPriority;
                          })
                          .slice(0, 9)
                          .map((partita, idx) => {
                            const team1Played = teamPlayedCount[partita.team1] || 0;
                            const team2Played = teamPlayedCount[partita.team2] || 0;
                            const campoColor = 
                              partita.campo === 'A' ? 'from-red-500 to-pink-500' :
                              partita.campo === 'B' ? 'from-blue-500 to-cyan-500' :
                              'from-green-500 to-emerald-500';
                            const campoOccupied = isCampoOccupied(partita.campo);
                            const matchKey = `${partita.girone}-${partita.team1}-${partita.team2}`;
                            const turnoNumber = matchToTurno[matchKey] || '?';
                            const gironeNumber = partita.girone === 'girone1' ? '1' : '2';
                            
                            return (
                              <div 
                                key={idx}
                                className={`bg-gradient-to-br ${campoColor} rounded-xl p-4 md:p-5 border-2 ${
                                  campoOccupied ? 'border-red-400/50 opacity-60' : 'border-gray-400'
                                } shadow-lg`}
                              >
                                <div className="mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold text-white text-base md:text-lg">
                                      Campo {partita.campo} - Turno {turnoNumber} - Girone {gironeNumber}
                                    </div>
                                    {campoOccupied && (
                                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/30 text-red-200 font-bold border border-red-400 whitespace-nowrap ml-2">
                                        Occupato
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="bg-black/20 p-3 rounded">
                                    <div className="text-white font-semibold text-sm md:text-base">
                                      {partita.team1} - {team1Played} {team1Played === 1 ? 'Partita giocata' : 'Partite giocate'}
                                    </div>
                                  </div>
                                  <div className="text-center text-white/90 font-bold text-base">VS</div>
                                  <div className="bg-black/20 p-3 rounded">
                                    <div className="text-white font-semibold text-sm md:text-base">
                                      {partita.team2} - {team2Played} {team2Played === 1 ? 'Partita giocata' : 'Partite giocate'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => startMatch(partita)}
                                  disabled={campoOccupied}
                                  className={`w-full mt-3 ${
                                    campoOccupied 
                                      ? 'bg-gray-500/30 cursor-not-allowed' 
                                      : 'bg-white/20 hover:bg-white/30 active:bg-white/40'
                                  } text-white py-3 rounded-lg transition-all font-semibold text-sm md:text-base flex items-center justify-center gap-2`}
                                >
                                  <Play className="w-4 h-4 md:w-5 md:h-5" />
                                  {campoOccupied ? 'Campo Occupato' : 'Avvia Partita'}
                                </button>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </>
                )}
                
                {presentTeams.size > 0 && userRole === 'player' && (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-4">⚡ Partite Disponibili</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      {(() => {
                        // Calcola quante partite ha giocato ogni squadra
                        const teamPlayedCount = {};
                        [...teams.girone1, ...teams.girone2].forEach(team => {
                          if (team && team.name) {
                            teamPlayedCount[team.name] = team.wins + team.losses;
                          }
                        });
                        
                        return scheduleWithStatus
                          .flatMap(turno => turno.partite || [])
                          .filter(partita => 
                            partita &&
                            !partita.played && 
                            !isMatchOngoing(partita) && 
                            isMatchAvailable(partita) &&
                            !isTeamPlaying(partita.team1) &&
                            !isTeamPlaying(partita.team2)
                          )
                          // Ordina per bilanciamento
                          .sort((a, b) => {
                            const aPriority = (teamPlayedCount[a.team1] || 0) + (teamPlayedCount[a.team2] || 0);
                            const bPriority = (teamPlayedCount[b.team1] || 0) + (teamPlayedCount[b.team2] || 0);
                            return aPriority - bPriority;
                          })
                          .slice(0, 6)
                          .map((partita, idx) => {
                            const team1Played = teamPlayedCount[partita.team1] || 0;
                            const team2Played = teamPlayedCount[partita.team2] || 0;
                            const campoColor = 
                              partita.campo === 'A' ? 'from-red-500 to-pink-500' :
                              partita.campo === 'B' ? 'from-blue-500 to-cyan-500' :
                              'from-green-500 to-emerald-500';
                            
                            return (
                              <div 
                                key={idx}
                                className={`bg-gradient-to-br ${campoColor} rounded-xl p-4 border-2 border-gray-400 shadow-lg`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-bold text-white text-lg">Campo {partita.campo}</span>
                                  <span className="text-xs px-2 py-1 rounded-full bg-white/20 text-white font-bold">
                                    {partita.girone === 'girone1' ? 'G1' : 'G2'}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="text-white font-semibold bg-black/20 p-2 rounded flex justify-between items-center">
                                    <span>{partita.team1}</span>
                                    <span className="text-xs bg-white/20 px-2 py-1 rounded">{team1Played}PG</span>
                                  </div>
                                  <div className="text-center text-white/90 font-bold">VS</div>
                                  <div className="text-white font-semibold bg-black/20 p-2 rounded flex justify-between items-center">
                                    <span>{partita.team2}</span>
                                    <span className="text-xs bg-white/20 px-2 py-1 rounded">{team2Played}PG</span>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </>
                )}
                
                {scheduleWithStatus
                  .flatMap(turno => turno.partite)
                  .filter(partita => !partita.played && !isMatchOngoing(partita) && isMatchAvailable(partita)).length === 0 && ongoingMatches.length === 0 && (
                  <p className="text-white/70 text-center py-4">Nessuna partita disponibile con le squadre presenti</p>
                )}
              </div>
            )}

            {/* Riepilogo Calendario */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-white">📅 Calendario Completo</h2>
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={downloadSimpleCalendar}
                    type="button"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-3 md:px-5 py-2 md:py-3 rounded-lg transition-all shadow-lg flex items-center gap-2 text-xs md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Tabella Semplice</span>
                    <span className="sm:hidden">Tabella</span>
                  </button>
                  <button
                    onClick={printCalendar}
                    type="button"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-3 md:px-5 py-2 md:py-3 rounded-lg transition-all shadow-lg flex items-center gap-2 text-xs md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Calendario Dettagliato</span>
                    <span className="sm:hidden">Calendario</span>
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-500/20 rounded-xl p-4 border border-green-400/30">
                  <p className="text-white/70 text-sm">Partite Completate</p>
                  <p className="text-3xl font-bold text-green-400">
                    {scheduleWithStatus.reduce((sum, turno) => 
                      sum + turno.partite.filter(p => p.played).length, 0
                    )}
                  </p>
                </div>
                <div className="bg-orange-500/20 rounded-xl p-4 border border-orange-400/30">
                  <p className="text-white/70 text-sm">Partite Rimanenti</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {scheduleWithStatus.reduce((sum, turno) => 
                      sum + turno.partite.filter(p => !p.played).length, 0
                    )}
                  </p>
                </div>
                <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-400/30">
                  <p className="text-white/70 text-sm">Turni Totali</p>
                  <p className="text-3xl font-bold text-blue-400">{scheduleWithStatus.length}</p>
                </div>
                <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-400/30">
                  <p className="text-white/70 text-sm">Progresso</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {((scheduleWithStatus.reduce((sum, turno) => 
                      sum + turno.partite.filter(p => p.played).length, 0
                    ) / 30) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Legenda Campi */}
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-6">
                <div className="flex gap-4 justify-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-pink-500 rounded"></div>
                    <span className="text-white font-semibold">Campo A</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded"></div>
                    <span className="text-white font-semibold">Campo B</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded"></div>
                    <span className="text-white font-semibold">Campo C</span>
                  </div>
                </div>
              </div>

              {/* Calendario Turni */}
              {scheduleWithStatus
                .filter(turno => {
                  if (!showOnlyAvailable) return true;
                  return turno.partite && turno.partite.some(p => p && !p.played && isMatchAvailable(p));
                })
                .map((turno) => {
                const tutteGiocate = turno.partite && turno.partite.every(p => p && p.played);
                const nessunaGiocata = turno.partite && turno.partite.every(p => p && !p.played);
                
                return (
                  <div 
                    key={turno.numero} 
                    className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 transition-all mb-6 ${
                      tutteGiocate 
                        ? 'border-green-400/50 bg-green-500/5' 
                        : nessunaGiocata 
                          ? 'border-white/20' 
                          : 'border-yellow-400/50 bg-yellow-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">
                        Turno {turno.numero}
                      </h3>
                      <div className="flex items-center gap-2">
                        {tutteGiocate && (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold border border-green-400/50">
                            ✓ Completato
                          </span>
                        )}
                        {!nessunaGiocata && !tutteGiocate && (
                          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold border border-yellow-400/50">
                            ⏳ In corso
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {turno.partite && turno.partite
                        .filter(partita => {
                          if (!showOnlyAvailable || !partita) return true;
                          return !partita.played && isMatchAvailable(partita);
                        })
                        .map((partita, idx) => {
                        if (!partita) return null;
                        const campoColor = 
                          partita.campo === 'A' ? 'from-red-500 to-pink-500' :
                          partita.campo === 'B' ? 'from-blue-500 to-cyan-500' :
                          'from-green-500 to-emerald-500';
                        
                        const gironeColor = partita.girone === 'girone1' ? 'yellow' : 'cyan';
                        const isAvailable = isMatchAvailable(partita);
                        const isOngoing = isMatchOngoing(partita);
                        const duration = getMatchDuration(partita);
                        const team1Playing = isTeamPlaying(partita.team1);
                        const team2Playing = isTeamPlaying(partita.team2);
                        const anyTeamPlaying = team1Playing || team2Playing;
                        
                        return (
                          <div 
                            key={idx}
                            className={`bg-gradient-to-br ${campoColor} bg-opacity-20 rounded-xl p-4 border-2 ${
                              partita.played 
                                ? 'border-green-400/50 opacity-60' 
                                : isOngoing
                                  ? 'border-yellow-400 shadow-lg shadow-yellow-500/30 animate-pulse'
                                  : anyTeamPlaying
                                    ? 'border-orange-400/50 opacity-50'
                                    : isAvailable && presentTeams.size > 0
                                      ? 'border-green-400/70 shadow-lg shadow-green-500/20'
                                      : 'border-white/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-white text-lg">Campo {partita.campo}</span>
                              <div className="flex gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full bg-${gironeColor}-500/20 text-${gironeColor}-400 font-bold border border-${gironeColor}-400/50`}>
                                  {partita.girone === 'girone1' ? 'G1' : 'G2'}
                                </span>
                                {!partita.played && isAvailable && presentTeams.size > 0 && !isOngoing && !anyTeamPlaying && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-bold border border-green-400/50">
                                    ✓
                                  </span>
                                )}
                                {isOngoing && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/30 text-yellow-300 font-bold border border-yellow-400 animate-pulse">
                                    ⏱️ {formatTimeWithSeconds(duration.minutes, duration.seconds)}
                                  </span>
                                )}
                                {anyTeamPlaying && !isOngoing && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-orange-500/30 text-orange-300 font-bold border border-orange-400">
                                    🔒 In campo
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className={`text-white font-semibold ${partita.played ? 'line-through opacity-60' : team1Playing ? 'opacity-60' : ''}`}>
                                {partita.team1} {team1Playing && !isOngoing && '🔒'}
                              </div>
                              <div className="text-center text-white/70 font-bold">VS</div>
                              <div className={`text-white font-semibold ${partita.played ? 'line-through opacity-60' : team2Playing ? 'opacity-60' : ''}`}>
                                {partita.team2} {team2Playing && !isOngoing && '🔒'}
                              </div>
                            </div>
                            
                            {/* Spazio per risultato */}
                            <div className="mt-3 border-t border-white/20 pt-3">
                              {partita.played ? (
                                <div className="text-center">
                                  {(() => {
                                    const matchResult = matches.find(m => 
                                      m.girone === partita.girone &&
                                      ((m.team1 === partita.team1 && m.team2 === partita.team2) ||
                                       (m.team1 === partita.team2 && m.team2 === partita.team1))
                                    );
                                    if (matchResult) {
                                      const score1 = matchResult.team1 === partita.team1 ? matchResult.score1 : matchResult.score2;
                                      const score2 = matchResult.team2 === partita.team2 ? matchResult.score2 : matchResult.score1;
                                      return (
                                        <div>
                                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-400/50">
                                            ✓ Giocata
                                          </span>
                                          <div className="text-white font-bold text-lg mt-2">
                                            {score1} - {score2}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-400/50">
                                        ✓ Giocata
                                      </span>
                                    );
                                  })()}
                                </div>
                              ) : isOngoing ? (
                                userRole === 'organizer' ? (
                                  <button
                                    onClick={() => stopMatch(partita)}
                                    className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 py-2 rounded-lg transition-all border border-red-400/50 font-semibold text-sm"
                                  >
                                    ⏹️ Ferma Timer
                                  </button>
                                ) : (
                                  <div className="text-center text-yellow-400 text-sm py-2 font-semibold animate-pulse">
                                    ⏱️ In corso...
                                  </div>
                                )
                              ) : anyTeamPlaying ? (
                                <div className="text-center text-orange-400 text-sm py-2 font-semibold">
                                  {userRole === 'organizer' ? 'Squadra in campo' : '⏱️ Squadra in campo'}
                                </div>
                              ) : isAvailable && presentTeams.size > 0 ? (
                                userRole === 'organizer' ? (
                                  <button
                                    onClick={() => startMatch(partita)}
                                    className="w-full bg-green-500/20 hover:bg-green-500/40 text-green-400 py-2 rounded-lg transition-all border border-green-400/50 font-semibold text-sm flex items-center justify-center gap-2"
                                  >
                                    <Play className="w-4 h-4" />
                                    Avvia Partita
                                  </button>
                                ) : (
                                  <div className="text-center text-green-400 text-sm py-2">
                                    ✓ Disponibile
                                  </div>
                                )
                              ) : (
                                <div className="text-center text-white/50 text-sm">
                                  {userRole === 'organizer' ? 'Risultato: ___ - ___' : 'In attesa'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'risultati' && (
          <div className="space-y-6">
            {/* Inserisci Risultato */}
            {userRole === 'organizer' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 md:p-8 border border-white/20 shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6">Inserisci Risultato</h2>
              
              {/* Avviso partita in corso */}
              {selectedMatch.team1 && selectedMatch.team2 && (() => {
                const ongoing = ongoingMatches.find(
                  m => m.girone === selectedMatch.girone &&
                       ((m.team1 === selectedMatch.team1 && m.team2 === selectedMatch.team2) ||
                        (m.team1 === selectedMatch.team2 && m.team2 === selectedMatch.team1))
                );
                if (ongoing) {
                  const duration = Math.floor((currentTime - ongoing.startTime) / 60000);
                  return (
                    <div className="mb-4 bg-yellow-500/20 border-2 border-yellow-400 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 animate-pulse" />
                        <div>
                          <p className="text-yellow-400 font-bold text-sm md:text-base">Partita in corso!</p>
                          <p className="text-white/80 text-xs md:text-sm">
                            Tempo: {duration} minuti - Verrà calcolato automaticamente
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
                <select
                  value={selectedMatch.girone}
                  onChange={(e) => setSelectedMatch({ ...selectedMatch, girone: e.target.value, team1: '', team2: '' })}
                  className="col-span-2 md:col-span-1 bg-white/20 text-white rounded-lg px-4 md:px-5 py-3 md:py-4 border border-white/30 focus:outline-none focus:border-white text-base md:text-lg min-h-[52px]"
                  style={{ color: 'white' }}
                >
                  <option value="girone1" style={{ background: '#1e293b', color: 'white' }}>Girone 1</option>
                  <option value="girone2" style={{ background: '#1e293b', color: 'white' }}>Girone 2</option>
                </select>
                <select
                  value={selectedMatch.team1}
                  onChange={(e) => setSelectedMatch({ ...selectedMatch, team1: e.target.value })}
                  className="col-span-2 md:col-span-1 bg-white/20 text-white rounded-lg px-4 md:px-5 py-3 md:py-4 border border-white/30 focus:outline-none focus:border-white text-base md:text-lg min-h-[52px]"
                  style={{ color: 'white' }}
                >
                  <option value="" style={{ background: '#1e293b', color: 'white' }}>Squadra 1</option>
                  {teams[selectedMatch.girone].map(team => (
                    <option key={team.id} value={team.name} style={{ background: '#1e293b', color: 'white' }}>{team.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Giochi"
                  value={selectedMatch.score1}
                  onChange={(e) => setSelectedMatch({ ...selectedMatch, score1: e.target.value })}
                  className="col-span-1 md:col-span-1 bg-white/20 text-white rounded-lg px-4 md:px-5 py-3 md:py-4 border border-white/30 focus:outline-none focus:border-white text-center text-base md:text-lg min-h-[52px]"
                  min="0"
                />
                <select
                  value={selectedMatch.team2}
                  onChange={(e) => setSelectedMatch({ ...selectedMatch, team2: e.target.value })}
                  className="col-span-2 md:col-span-1 bg-white/20 text-white rounded-lg px-4 md:px-5 py-3 md:py-4 border border-white/30 focus:outline-none focus:border-white text-base md:text-lg min-h-[52px]"
                  style={{ color: 'white' }}
                >
                  <option value="" style={{ background: '#1e293b', color: 'white' }}>Squadra 2</option>
                  {teams[selectedMatch.girone]
                    .filter(team => team.name !== selectedMatch.team1)
                    .map(team => (
                      <option key={team.id} value={team.name} style={{ background: '#1e293b', color: 'white' }}>{team.name}</option>
                    ))}
                </select>
                <input
                  type="number"
                  placeholder="Giochi"
                  value={selectedMatch.score2}
                  onChange={(e) => setSelectedMatch({ ...selectedMatch, score2: e.target.value })}
                  className="col-span-1 md:col-span-1 bg-white/20 text-white rounded-lg px-4 md:px-5 py-3 md:py-4 border border-white/30 focus:outline-none focus:border-white text-center text-base md:text-lg min-h-[52px]"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Min (auto)"
                  value={selectedMatch.duration}
                  onChange={(e) => setSelectedMatch({ ...selectedMatch, duration: e.target.value })}
                  className="col-span-2 md:col-span-1 bg-white/20 text-white rounded-lg px-4 md:px-5 py-3 md:py-4 border border-white/30 focus:outline-none focus:border-white text-center text-base md:text-lg min-h-[52px]"
                  min="0"
                  title="Calcolato automaticamente se partita avviata"
                  disabled={selectedMatch.team1 && selectedMatch.team2 && ongoingMatches.some(
                    m => m.girone === selectedMatch.girone &&
                         ((m.team1 === selectedMatch.team1 && m.team2 === selectedMatch.team2) ||
                          (m.team1 === selectedMatch.team2 && m.team2 === selectedMatch.team1))
                  )}
                />
              </div>
              <button
                onClick={addMatch}
                className="mt-5 md:mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 md:py-5 rounded-lg hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 transition-all text-base md:text-lg min-h-[56px]"
              >
                Aggiungi Risultato
              </button>
            </div>
            )}

            {/* Partite Giocate */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Partite Giocate</h2>
              <div className="space-y-3">
                {matches.length === 0 ? (
                  <p className="text-white/60 text-center py-8">Nessuna partita inserita</p>
                ) : (
                  (() => {
                    // Mappa per trovare campo e turno di ogni partita
                    const matchToInfo = {};
                    scheduleWithStatus.forEach(turno => {
                      turno.partite?.forEach(partita => {
                        if (partita) {
                          const key = `${partita.girone}-${partita.team1}-${partita.team2}`;
                          matchToInfo[key] = { campo: partita.campo, turno: turno.numero };
                        }
                      });
                    });
                    
                    return matches.slice().reverse().map(match => {
                      const matchKey = `${match.girone}-${match.team1}-${match.team2}`;
                      const reverseKey = `${match.girone}-${match.team2}-${match.team1}`;
                      const info = matchToInfo[matchKey] || matchToInfo[reverseKey];
                      
                      return (
                        <div key={match.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="text-xs text-white/60 uppercase">
                                {match.girone === 'girone1' ? 'Girone 1' : 'Girone 2'}
                              </span>
                              {info && (
                                <>
                                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-400/50">
                                    Campo {info.campo}
                                  </span>
                                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-400/50">
                                    Turno {info.turno}
                                  </span>
                                </>
                              )}
                              {match.duration && (
                                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full border border-indigo-400/50">
                                  ⏱️ {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className={`font-semibold ${match.winner === match.team1 ? 'text-green-400' : 'text-white'} flex items-center gap-2`}>
                                {match.team1} {match.winner === match.team1 && '🏆'}
                              </span>
                              <span className="text-2xl font-bold text-yellow-400">{match.score1} - {match.score2}</span>
                              <span className={`font-semibold ${match.winner === match.team2 ? 'text-green-400' : 'text-white'} flex items-center gap-2`}>
                                {match.team2} {match.winner === match.team2 && '🏆'}
                              </span>
                            </div>
                          </div>
                          {userRole === 'organizer' && (
                            <button
                              onClick={() => deleteMatch(match.id)}
                              className="ml-4 bg-red-500/20 hover:bg-red-500/40 text-red-400 p-3 rounded-lg transition-all border border-red-500/50"
                              title="Elimina risultato"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statistiche' && (
          <div className="space-y-6">
            {/* Pulsanti Genera Report */}
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-blue-400/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">📊 Report del Torneo</h3>
                  <p className="text-white/70 text-sm">
                    Genera report PDF con statistiche e risultati del torneo
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={generateStatisticsPDF}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-6 py-3 rounded-lg transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Statistiche Base
                  </button>
                  <button
                    onClick={generateCompletePDF}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-6 py-3 rounded-lg transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                  >
                    <Download className="w-5 h-5" />
                    Report Completo
                  </button>
                </div>
              </div>
            </div>

            {/* Statistiche Generali */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">📊 Statistiche Generali</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-3 md:p-4 border border-blue-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Partite Giocate</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">{matches.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-3 md:p-4 border border-green-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Game Totali</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {matches.reduce((sum, m) => sum + m.score1 + m.score2, 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 md:p-4 border border-yellow-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Media Game/Partita</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {matches.length > 0 
                      ? (matches.reduce((sum, m) => sum + m.score1 + m.score2, 0) / matches.length).toFixed(1)
                      : '0'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-3 md:p-4 border border-purple-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Partite Rimanenti</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">{30 - matches.length}</p>
                  <p className="text-xs text-white/60 mt-1">(15 per girone)</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl p-3 md:p-4 border border-indigo-400/30">
                  <p className="text-white/70 text-xs md:text-sm">Tempo Medio</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {(() => {
                      const matchesWithDuration = matches.filter(m => m.duration);
                      if (matchesWithDuration.length === 0) return '--';
                      const avgSeconds = matchesWithDuration.reduce((sum, m) => sum + m.duration, 0) / matchesWithDuration.length;
                      const avgMinutes = Math.floor(avgSeconds / 60);
                      const avgSecs = Math.round(avgSeconds % 60);
                      return `${avgMinutes}:${avgSecs.toString().padStart(2, '0')}`;
                    })()}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    {(() => {
                      const matchesWithDuration = matches.filter(m => m.duration);
                      return matchesWithDuration.length > 0 
                        ? `minuti (${matchesWithDuration.length} registrate)`
                        : 'minuti';
                    })()}
                  </p>
                </div>
              </div>
              
              {/* Partite In Corso */}
              {ongoingMatches.length > 0 && (
                <div className="mt-4">
                  <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-orange-400" />
                      <p className="text-white/90 font-semibold">Partite In Corso</p>
                    </div>
                    <div className="space-y-2">
                      {ongoingMatches.map((match, idx) => {
                        const duration = getMatchDuration(match);
                        return (
                          <div key={idx} className="bg-black/20 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold text-sm">
                                Campo {match.campo} - {match.team1} vs {match.team2}
                              </p>
                              <p className="text-white/60 text-xs mt-1">
                                {match.girone === 'girone1' ? 'Girone 1' : 'Girone 2'}
                              </p>
                            </div>
                            <div className="text-orange-400 font-bold text-lg">
                              {formatTimeWithSeconds(duration.minutes, duration.seconds)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Completamento Gironi */}
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                    <p className="text-white/70 text-sm font-semibold">Completamento Girone 1</p>
                  </div>
                  {(() => {
                    const girone1Matches = matches.filter(m => m.girone === 'girone1').length;
                    const totalGirone1 = 15;
                    const percentageGirone1 = ((girone1Matches / totalGirone1) * 100).toFixed(0);
                    return (
                      <>
                        <p className="text-3xl font-bold text-yellow-400">{percentageGirone1}%</p>
                        <p className="text-white/60 text-xs mt-1">{girone1Matches} / {totalGirone1} partite</p>
                      </>
                    );
                  })()}
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-cyan-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                    <p className="text-white/70 text-sm font-semibold">Completamento Girone 2</p>
                  </div>
                  {(() => {
                    const girone2Matches = matches.filter(m => m.girone === 'girone2').length;
                    const totalGirone2 = 15;
                    const percentageGirone2 = ((girone2Matches / totalGirone2) * 100).toFixed(0);
                    return (
                      <>
                        <p className="text-3xl font-bold text-cyan-400">{percentageGirone2}%</p>
                        <p className="text-white/60 text-xs mt-1">{girone2Matches} / {totalGirone2} partite</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Partite Più Lunghe e Più Brevi */}
              {(() => {
                const matchesWithDuration = matches.filter(m => m.duration);
                if (matchesWithDuration.length === 0) return null;
                
                const longest = matchesWithDuration.reduce((max, match) => 
                  match.duration > max.duration ? match : max
                );
                const shortest = matchesWithDuration.reduce((min, match) => 
                  match.duration < min.duration ? match : min
                );
                
                return (
                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-4 border border-red-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-red-400" />
                        <p className="text-white/70 text-sm font-semibold">Partita Più Lunga</p>
                      </div>
                      <p className="text-lg font-bold text-white mb-1">
                        {longest.team1} vs {longest.team2}
                      </p>
                      <p className="text-2xl font-bold text-red-400">
                        {Math.floor(longest.duration / 60)}:{(longest.duration % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        {longest.score1} - {longest.score2} • {longest.girone === 'girone1' ? 'Girone 1' : 'Girone 2'}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-green-400" />
                        <p className="text-white/70 text-sm font-semibold">Partita Più Breve</p>
                      </div>
                      <p className="text-lg font-bold text-white mb-1">
                        {shortest.team1} vs {shortest.team2}
                      </p>
                      <p className="text-2xl font-bold text-green-400">
                        {Math.floor(shortest.duration / 60)}:{(shortest.duration % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        {shortest.score1} - {shortest.score2} • {shortest.girone === 'girone1' ? 'Girone 1' : 'Girone 2'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Stime Orari */}
              {(() => {
                const matchesWithDuration = matches.filter(m => m.duration);
                if (matchesWithDuration.length === 0 || !tournamentStartTime) return null;
                
                const avgDurationSeconds = matchesWithDuration.reduce((sum, m) => sum + m.duration, 0) / matchesWithDuration.length;
                const remainingMatches = 30 - matches.length;
                const totalSecondsForGironi = remainingMatches * avgDurationSeconds;
                const totalSecondsForTorneo = totalSecondsForGironi + (4 * avgDurationSeconds); // +4 partite fase finale
                
                const startTime = new Date(tournamentStartTime);
                const endGironi = new Date(tournamentStartTime + totalSecondsForGironi * 1000);
                const endTorneo = new Date(tournamentStartTime + totalSecondsForTorneo * 1000);
                
                const formatTimeFromSeconds = (seconds) => {
                  const totalMinutes = Math.round(seconds / 60);
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;
                  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                };
                
                return (
                  <div className="mt-6 space-y-4">
                    {/* Orario di Inizio */}
                    <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl p-4 border border-blue-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <p className="text-white/70 text-sm font-semibold">Inizio Torneo</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">
                        {startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        Rilevato al primo risultato
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-400/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-orange-400" />
                          <p className="text-white/70 text-sm font-semibold">Stima Fine Gironi</p>
                        </div>
                        <p className="text-2xl font-bold text-orange-400">
                          {endGironi.getHours().toString().padStart(2, '0')}:{endGironi.getMinutes().toString().padStart(2, '0')}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          Circa {formatTimeFromSeconds(totalSecondsForGironi)} rimanenti
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-4 border border-pink-400/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-pink-400" />
                          <p className="text-white/70 text-sm font-semibold">Stima Fine Torneo</p>
                        </div>
                        <p className="text-2xl font-bold text-pink-400">
                          {endTorneo.getHours().toString().padStart(2, '0')}:{endTorneo.getMinutes().toString().padStart(2, '0')}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          Include semifinali e finale (+{formatTimeFromSeconds(4 * avgDurationSeconds)})
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Classifica Generale */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">🏆 Classifica Generale</h2>
                <p className="text-yellow-400 text-sm font-semibold italic">⚠️ Solo per fini statistici - Le qualificazioni si basano sulle classifiche dei singoli gironi</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Squadra</th>
                      <th className="text-center py-2 px-2">Girone</th>
                      <th className="text-center py-2 px-2">PG</th>
                      <th className="text-center py-2 px-2">V</th>
                      <th className="text-center py-2 px-2">P</th>
                      <th className="text-center py-2 px-2">GF</th>
                      <th className="text-center py-2 px-2">GS</th>
                      <th className="text-center py-2 px-2">+/-</th>
                      <th className="text-center py-2 px-2">Pt</th>
                      <th className="text-center py-2 px-2">%V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...teams.girone1, ...teams.girone2]
                      .sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        const diffA = a.gamesWon - a.gamesLost;
                        const diffB = b.gamesWon - b.gamesLost;
                        if (diffB !== diffA) return diffB - diffA;
                        return b.gamesWon - a.gamesWon;
                      })
                      .map((team, idx) => {
                        const totalMatches = team.wins + team.losses;
                        const winPercentage = totalMatches > 0 ? ((team.wins / totalMatches) * 100).toFixed(0) : 0;
                        const girone = teams.girone1.includes(team) ? '1' : '2';
                        return (
                          <tr key={team.id} className={`border-b border-white/10 ${idx < 4 ? 'bg-green-500/10' : ''}`}>
                            <td className="py-3 px-2 font-bold">{idx + 1}</td>
                            <td className="py-3 px-2 font-semibold">{team.name}</td>
                            <td className="text-center py-3 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                girone === '1' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-cyan-500/20 text-cyan-400'
                              }`}>
                                G{girone}
                              </span>
                            </td>
                            <td className="text-center py-3 px-2 text-blue-400 font-semibold">{totalMatches}</td>
                            <td className="text-center py-3 px-2">{team.wins}</td>
                            <td className="text-center py-3 px-2">{team.losses}</td>
                            <td className="text-center py-3 px-2 text-green-400">{team.gamesWon}</td>
                            <td className="text-center py-3 px-2 text-red-400">{team.gamesLost}</td>
                            <td className="text-center py-3 px-2 font-bold">
                              <span className={team.gamesWon - team.gamesLost >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {team.gamesWon - team.gamesLost > 0 ? '+' : ''}{team.gamesWon - team.gamesLost}
                              </span>
                            </td>
                            <td className="text-center py-3 px-2 font-bold text-yellow-400">{team.points}</td>
                            <td className="text-center py-3 px-2">{winPercentage}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Record */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Migliore Attacco */}
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-orange-400/30">
                <h3 className="text-xl font-bold text-white mb-4">🔥 Migliore Attacco</h3>
                {(() => {
                  const bestAttack = [...teams.girone1, ...teams.girone2]
                    .filter(t => t.wins + t.losses > 0)
                    .sort((a, b) => b.gamesWon - a.gamesWon)[0];
                  return bestAttack ? (
                    <div>
                      <p className="text-2xl font-bold text-orange-400">{bestAttack.name}</p>
                      <p className="text-white/80 mt-2">{bestAttack.gamesWon} game vinti in {bestAttack.wins + bestAttack.losses} partite</p>
                      <p className="text-white/60 text-sm mt-1">
                        Media: {((bestAttack.gamesWon / (bestAttack.wins + bestAttack.losses)) || 0).toFixed(1)} game/partita
                      </p>
                    </div>
                  ) : <p className="text-white/60">Nessun dato disponibile</p>;
                })()}
              </div>

              {/* Migliore Difesa */}
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-400/30">
                <h3 className="text-xl font-bold text-white mb-4">🛡️ Migliore Difesa</h3>
                {(() => {
                  const bestDefense = [...teams.girone1, ...teams.girone2]
                    .filter(t => t.wins + t.losses > 0)
                    .sort((a, b) => a.gamesLost - b.gamesLost)[0];
                  return bestDefense ? (
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">{bestDefense.name}</p>
                      <p className="text-white/80 mt-2">{bestDefense.gamesLost} game subiti in {bestDefense.wins + bestDefense.losses} partite</p>
                      <p className="text-white/60 text-sm mt-1">
                        Media: {((bestDefense.gamesLost / (bestDefense.wins + bestDefense.losses)) || 0).toFixed(1)} game subiti/partita
                      </p>
                    </div>
                  ) : <p className="text-white/60">Nessun dato disponibile</p>;
                })()}
              </div>

              {/* Imbattute */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-400/30">
                <h3 className="text-xl font-bold text-white mb-4">✨ Squadre Imbattute</h3>
                {(() => {
                  const unbeaten = [...teams.girone1, ...teams.girone2].filter(t => t.wins > 0 && t.losses === 0);
                  return unbeaten.length > 0 ? (
                    <div className="space-y-2">
                      {unbeaten.map(team => (
                        <div key={team.id} className="flex justify-between items-center">
                          <span className="text-green-400 font-semibold">{team.name}</span>
                          <span className="text-white/80">{team.wins}V - 0P</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-white/60">Nessuna squadra imbattuta</p>;
                })()}
              </div>

              {/* In Difficoltà */}
              <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-6 border border-red-400/30">
                <h3 className="text-xl font-bold text-white mb-4">⚠️ In Difficoltà</h3>
                {(() => {
                  const struggling = [...teams.girone1, ...teams.girone2]
                    .filter(t => t.losses > 0 && t.wins === 0)
                    .sort((a, b) => b.losses - a.losses);
                  return struggling.length > 0 ? (
                    <div className="space-y-2">
                      {struggling.map(team => (
                        <div key={team.id} className="flex justify-between items-center">
                          <span className="text-red-400 font-semibold">{team.name}</span>
                          <span className="text-white/80">0V - {team.losses}P</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-white/60">Tutte le squadre hanno vinto almeno una partita</p>;
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finali' && (
          <div className="space-y-6">
            {/* Verifica completamento gironi */}
            {matches.length < 30 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
                <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Fase Finale Non Disponibile</h2>
                <p className="text-white/70 mb-4">Completa tutti i gironi prima di iniziare la fase finale</p>
                <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/50 inline-block">
                  <p className="text-yellow-400 font-bold text-xl">
                    {matches.length} / 30 partite completate
                  </p>
                  <p className="text-white/60 text-sm mt-1">Mancano {30 - matches.length} partite</p>
                </div>
              </div>
            ) : (
              <>
                {/* Qualificate */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Squadre Qualificate 🏆</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xl font-bold text-yellow-400 mb-3">Girone 1</h3>
                      {qualified.girone1.map((team, idx) => (
                        <div key={team.id} className="bg-white/10 rounded-lg p-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-purple-900">
                              {idx + 1}
                            </div>
                            <span className="font-semibold text-white">{team.name}</span>
                            <span className="ml-auto text-yellow-400 font-bold">{team.points} pt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-cyan-400 mb-3">Girone 2</h3>
                      {qualified.girone2.map((team, idx) => (
                        <div key={team.id} className="bg-white/10 rounded-lg p-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center font-bold text-purple-900">
                              {idx + 1}
                            </div>
                            <span className="font-semibold text-white">{team.name}</span>
                            <span className="ml-auto text-cyan-400 font-bold">{team.points} pt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SEMIFINALI */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-3xl font-bold text-white mb-6 text-center">⚔️ SEMIFINALI ⚔️</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Semifinale 1 */}
                    {(() => {
                      const semi1Team1 = qualified.girone1[0]?.name;
                      const semi1Team2 = qualified.girone2[1]?.name;
                      const semi1Result = finalMatches.find(m => m.type === 'semifinale1');
                      const semi1Ongoing = ongoingFinalMatches.find(m => m.type === 'semifinale1');
                      const duration1 = semi1Ongoing ? getMatchDuration({ ...semi1Ongoing, girone: 'finale' }) : null;
                      const isFinishing1 = finishingMatch?.type === 'semifinale1';
                      
                      return (
                        <div className={`bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border-2 ${
                          semi1Ongoing ? 'border-yellow-400 animate-pulse shadow-lg shadow-yellow-500/30' : 
                          semi1Result ? 'border-green-400/50' : 'border-yellow-400/50'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">SEMIFINALE 1</h3>
                            {semi1Ongoing && duration1 && (
                              <span className="text-sm px-3 py-1.5 rounded-full bg-yellow-500/30 text-yellow-300 font-bold border border-yellow-400 animate-pulse">
                                ⏱️ {formatTimeWithSeconds(duration1.minutes, duration1.seconds)}
                              </span>
                            )}
                            {semi1Result && (
                              <span className="text-sm px-3 py-1.5 rounded-full bg-green-500/30 text-green-300 font-bold border border-green-400">
                                ✓ Completata
                              </span>
                            )}
                          </div>
                          
                          {isFinishing1 ? (
                            <div className="space-y-4">
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi1Team1}
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={quickResult.score1}
                                  onChange={(e) => setQuickResult({ ...quickResult, score1: e.target.value })}
                                  className="flex-1 bg-white text-gray-900 text-center font-bold text-3xl rounded-lg px-4 py-4 border-2 border-gray-400 min-h-[56px]"
                                  min="0"
                                  autoFocus
                                />
                                <span className="text-white font-bold text-2xl">-</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={quickResult.score2}
                                  onChange={(e) => setQuickResult({ ...quickResult, score2: e.target.value })}
                                  className="flex-1 bg-white text-gray-900 text-center font-bold text-3xl rounded-lg px-4 py-4 border-2 border-gray-400 min-h-[56px]"
                                  min="0"
                                />
                              </div>
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi1Team2}
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    if (!quickResult.score1 || !quickResult.score2) {
                                      setSuccessMessage('⚠️ ATTENZIONE\n\nInserisci entrambi i punteggi!');
                                      setShowSuccessModal(true);
                                      return;
                                    }
                                    const score1 = parseInt(quickResult.score1);
                                    const score2 = parseInt(quickResult.score2);
                                    const duration = Math.round((Date.now() - semi1Ongoing.startTime) / 1000);
                                    
                                    const newMatch = {
                                      type: 'semifinale1',
                                      team1: semi1Team1,
                                      team2: semi1Team2,
                                      score1,
                                      score2,
                                      duration,
                                      winner: score1 > score2 ? semi1Team1 : semi1Team2
                                    };
                                    
                                    setFinalMatches([...finalMatches, newMatch]);
                                    setOngoingFinalMatches(ongoingFinalMatches.filter(m => m.type !== 'semifinale1'));
                                    setFinishingMatch(null);
                                    setQuickResult({ score1: '', score2: '' });
                                  }}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg transition-all min-h-[52px]"
                                >
                                  ✓ Salva
                                </button>
                                <button
                                  onClick={() => {
                                    setFinishingMatch(null);
                                    setQuickResult({ score1: '', score2: '' });
                                  }}
                                  className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition-all min-h-[52px]"
                                >
                                  ✕ Annulla
                                </button>
                              </div>
                            </div>
                          ) : semi1Result ? (
                            <div className="space-y-3">
                              <div className={`text-white font-semibold bg-black/20 p-4 rounded text-center ${
                                semi1Result.winner === semi1Team1 ? 'border-2 border-green-400' : ''
                              }`}>
                                {semi1Team1} {semi1Result.winner === semi1Team1 && '🏆'}
                              </div>
                              <div className="text-center">
                                <span className="text-3xl font-bold text-yellow-400">
                                  {semi1Result.score1} - {semi1Result.score2}
                                </span>
                                {semi1Result.duration && (
                                  <p className="text-white/60 text-sm mt-2">
                                    Durata: {Math.floor(semi1Result.duration / 60)}:{(semi1Result.duration % 60).toString().padStart(2, '0')}
                                  </p>
                                )}
                              </div>
                              <div className={`text-white font-semibold bg-black/20 p-4 rounded text-center ${
                                semi1Result.winner === semi1Team2 ? 'border-2 border-green-400' : ''
                              }`}>
                                {semi1Team2} {semi1Result.winner === semi1Team2 && '🏆'}
                              </div>
                              {userRole === 'organizer' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Eliminare il risultato di questa semifinale?')) {
                                      setFinalMatches(finalMatches.filter(m => m.type !== 'semifinale1'));
                                    }
                                  }}
                                  className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 py-3 rounded-lg transition-all border border-red-400/50 font-semibold flex items-center justify-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Elimina Risultato
                                </button>
                              )}
                            </div>
                          ) : semi1Ongoing ? (
                            <div className="space-y-3">
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi1Team1}
                              </div>
                              <div className="text-center text-white/90 font-bold text-xl">VS</div>
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi1Team2}
                              </div>
                              {userRole === 'organizer' && (
                                <button
                                  onClick={() => {
                                    setFinishingMatch({ type: 'semifinale1' });
                                    setQuickResult({ score1: '', score2: '' });
                                  }}
                                  className="w-full bg-white/30 hover:bg-white/40 text-white font-bold py-4 rounded-lg transition-all border-2 border-gray-400 min-h-[52px]"
                                >
                                  🏁 Partita Finita
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi1Team1}
                              </div>
                              <div className="text-center text-white/90 font-bold text-xl">VS</div>
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi1Team2}
                              </div>
                              {userRole === 'organizer' && (
                                <button
                                  onClick={() => {
                                    setOngoingFinalMatches([...ongoingFinalMatches, {
                                      type: 'semifinale1',
                                      team1: semi1Team1,
                                      team2: semi1Team2,
                                      startTime: Date.now()
                                    }]);
                                  }}
                                  className="w-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white py-3 rounded-lg transition-all font-semibold text-sm md:text-base flex items-center justify-center gap-2"
                                >
                                  <Play className="w-4 h-4 md:w-5 md:h-5" />
                                  Avvia Semifinale
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Semifinale 2 */}
                    {(() => {
                      const semi2Team1 = qualified.girone2[0]?.name;
                      const semi2Team2 = qualified.girone1[1]?.name;
                      const semi2Result = finalMatches.find(m => m.type === 'semifinale2');
                      const semi2Ongoing = ongoingFinalMatches.find(m => m.type === 'semifinale2');
                      const duration2 = semi2Ongoing ? getMatchDuration({ ...semi2Ongoing, girone: 'finale' }) : null;
                      const isFinishing2 = finishingMatch?.type === 'semifinale2';
                      
                      return (
                        <div className={`bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 border-2 ${
                          semi2Ongoing ? 'border-cyan-400 animate-pulse shadow-lg shadow-cyan-500/30' : 
                          semi2Result ? 'border-green-400/50' : 'border-cyan-400/50'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">SEMIFINALE 2</h3>
                            {semi2Ongoing && duration2 && (
                              <span className="text-sm px-3 py-1.5 rounded-full bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-400 animate-pulse">
                                ⏱️ {formatTimeWithSeconds(duration2.minutes, duration2.seconds)}
                              </span>
                            )}
                            {semi2Result && (
                              <span className="text-sm px-3 py-1.5 rounded-full bg-green-500/30 text-green-300 font-bold border border-green-400">
                                ✓ Completata
                              </span>
                            )}
                          </div>
                          
                          {isFinishing2 ? (
                            <div className="space-y-4">
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi2Team1}
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={quickResult.score1}
                                  onChange={(e) => setQuickResult({ ...quickResult, score1: e.target.value })}
                                  className="flex-1 bg-white text-gray-900 text-center font-bold text-3xl rounded-lg px-4 py-4 border-2 border-gray-400 min-h-[56px]"
                                  min="0"
                                  autoFocus
                                />
                                <span className="text-white font-bold text-2xl">-</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={quickResult.score2}
                                  onChange={(e) => setQuickResult({ ...quickResult, score2: e.target.value })}
                                  className="flex-1 bg-white text-gray-900 text-center font-bold text-3xl rounded-lg px-4 py-4 border-2 border-gray-400 min-h-[56px]"
                                  min="0"
                                />
                              </div>
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi2Team2}
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    if (!quickResult.score1 || !quickResult.score2) {
                                      setSuccessMessage('⚠️ ATTENZIONE\n\nInserisci entrambi i punteggi!');
                                      setShowSuccessModal(true);
                                      return;
                                    }
                                    const score1 = parseInt(quickResult.score1);
                                    const score2 = parseInt(quickResult.score2);
                                    const duration = Math.round((Date.now() - semi2Ongoing.startTime) / 1000);
                                    
                                    const newMatch = {
                                      type: 'semifinale2',
                                      team1: semi2Team1,
                                      team2: semi2Team2,
                                      score1,
                                      score2,
                                      duration,
                                      winner: score1 > score2 ? semi2Team1 : semi2Team2
                                    };
                                    
                                    setFinalMatches([...finalMatches, newMatch]);
                                    setOngoingFinalMatches(ongoingFinalMatches.filter(m => m.type !== 'semifinale2'));
                                    setFinishingMatch(null);
                                    setQuickResult({ score1: '', score2: '' });
                                  }}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg transition-all min-h-[52px]"
                                >
                                  ✓ Salva
                                </button>
                                <button
                                  onClick={() => {
                                    setFinishingMatch(null);
                                    setQuickResult({ score1: '', score2: '' });
                                  }}
                                  className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition-all min-h-[52px]"
                                >
                                  ✕ Annulla
                                </button>
                              </div>
                            </div>
                          ) : semi2Result ? (
                            <div className="space-y-3">
                              <div className={`text-white font-semibold bg-black/20 p-4 rounded text-center ${
                                semi2Result.winner === semi2Team1 ? 'border-2 border-green-400' : ''
                              }`}>
                                {semi2Team1} {semi2Result.winner === semi2Team1 && '🏆'}
                              </div>
                              <div className="text-center">
                                <span className="text-3xl font-bold text-cyan-400">
                                  {semi2Result.score1} - {semi2Result.score2}
                                </span>
                                {semi2Result.duration && (
                                  <p className="text-white/60 text-sm mt-2">
                                    Durata: {Math.floor(semi2Result.duration / 60)}:{(semi2Result.duration % 60).toString().padStart(2, '0')}
                                  </p>
                                )}
                              </div>
                              <div className={`text-white font-semibold bg-black/20 p-4 rounded text-center ${
                                semi2Result.winner === semi2Team2 ? 'border-2 border-green-400' : ''
                              }`}>
                                {semi2Team2} {semi2Result.winner === semi2Team2 && '🏆'}
                              </div>
                              {userRole === 'organizer' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Eliminare il risultato di questa semifinale?')) {
                                      setFinalMatches(finalMatches.filter(m => m.type !== 'semifinale2'));
                                    }
                                  }}
                                  className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 py-3 rounded-lg transition-all border border-red-400/50 font-semibold flex items-center justify-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Elimina Risultato
                                </button>
                              )}
                            </div>
                          ) : semi2Ongoing ? (
                            <div className="space-y-3">
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi2Team1}
                              </div>
                              <div className="text-center text-white/90 font-bold text-xl">VS</div>
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi2Team2}
                              </div>
                              {userRole === 'organizer' && (
                                <button
                                  onClick={() => {
                                    setFinishingMatch({ type: 'semifinale2' });
                                    setQuickResult({ score1: '', score2: '' });
                                  }}
                                  className="w-full bg-white/30 hover:bg-white/40 text-white font-bold py-4 rounded-lg transition-all border-2 border-gray-400 min-h-[52px]"
                                >
                                  🏁 Partita Finita
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi2Team1}
                              </div>
                              <div className="text-center text-white/90 font-bold text-xl">VS</div>
                              <div className="text-white font-semibold bg-black/20 p-4 rounded text-center">
                                {semi2Team2}
                              </div>
                              {userRole === 'organizer' && (
                                <button
                                  onClick={() => {
                                    setOngoingFinalMatches([...ongoingFinalMatches, {
                                      type: 'semifinale2',
                                      team1: semi2Team1,
                                      team2: semi2Team2,
                                      startTime: Date.now()
                                    }]);
                                  }}
                                  className="w-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white py-3 rounded-lg transition-all font-semibold text-sm md:text-base flex items-center justify-center gap-2"
                                >
                                  <Play className="w-4 h-4 md:w-5 md:h-5" />
                                  Avvia Semifinale
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* FINALE */}
                {(() => {
                  const semi1Result = finalMatches.find(m => m.type === 'semifinale1');
                  const semi2Result = finalMatches.find(m => m.type === 'semifinale2');
                  const bothSemiCompleted = semi1Result && semi2Result;
                  
                  if (!bothSemiCompleted) {
                    return (
                      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
                        <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                        <h2 className="text-2xl font-bold text-white mb-2">Finale</h2>
                        <p className="text-white/70">Completa entrambe le semifinali per sbloccare la finale</p>
                      </div>
                    );
                  }
                  
                  const finaleTeam1 = semi1Result.winner;
                  const finaleTeam2 = semi2Result.winner;
                  const finaleResult = finalMatches.find(m => m.type === 'finale');
                  const finaleOngoing = ongoingFinalMatches.find(m => m.type === 'finale');
                  const durationFinale = finaleOngoing ? getMatchDuration({ ...finaleOngoing, girone: 'finale' }) : null;
                  const isFinishingFinale = finishingMatch?.type === 'finale';
                  
                  return (
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-8 border-2 border-purple-400/50">
                      <div className="text-center mb-6">
                        <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-4xl font-bold text-white mb-2">🏆 FINALE 🏆</h2>
                        {finaleOngoing && durationFinale && (
                          <span className="inline-block mt-2 text-lg px-4 py-2 rounded-full bg-purple-500/30 text-purple-300 font-bold border border-purple-400 animate-pulse">
                            ⏱️ {formatTimeWithSeconds(durationFinale.minutes, durationFinale.seconds)}
                          </span>
                        )}
                        {finaleResult && (
                          <span className="inline-block mt-2 text-lg px-4 py-2 rounded-full bg-green-500/30 text-green-300 font-bold border border-green-400">
                            ✓ Torneo Concluso
                          </span>
                        )}
                      </div>
                      
                      {isFinishingFinale ? (
                        <div className="max-w-2xl mx-auto space-y-4">
                          <div className="text-white font-semibold bg-black/20 p-5 rounded-lg text-center text-xl">
                            {finaleTeam1}
                          </div>
                          <div className="flex items-center gap-4">
                            <input
                              type="number"
                              placeholder="0"
                              value={quickResult.score1}
                              onChange={(e) => setQuickResult({ ...quickResult, score1: e.target.value })}
                              className="flex-1 bg-white/90 text-gray-900 placeholder:text-gray-400 text-center font-bold text-4xl rounded-lg px-6 py-6 border-2 border-white shadow-lg"
                              min="0"
                              autoFocus
                            />
                            <span className="text-white font-bold text-3xl">-</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={quickResult.score2}
                              onChange={(e) => setQuickResult({ ...quickResult, score2: e.target.value })}
                              className="flex-1 bg-white/90 text-gray-900 placeholder:text-gray-400 text-center font-bold text-4xl rounded-lg px-6 py-6 border-2 border-white shadow-lg"
                              min="0"
                            />
                          </div>
                          <div className="text-white font-semibold bg-black/20 p-5 rounded-lg text-center text-xl">
                            {finaleTeam2}
                          </div>
                          <div className="flex gap-4 mt-6">
                            <button
                              onClick={() => {
                                if (!quickResult.score1 || !quickResult.score2) {
                                  setSuccessMessage('⚠️ ATTENZIONE\n\nInserisci entrambi i punteggi!');
                                  setShowSuccessModal(true);
                                  return;
                                }
                                const score1 = parseInt(quickResult.score1);
                                const score2 = parseInt(quickResult.score2);
                                const duration = Math.round((Date.now() - finaleOngoing.startTime) / 1000);
                                
                                const newMatch = {
                                  type: 'finale',
                                  team1: finaleTeam1,
                                  team2: finaleTeam2,
                                  score1,
                                  score2,
                                  duration,
                                  winner: score1 > score2 ? finaleTeam1 : finaleTeam2
                                };
                                
                                setFinalMatches([...finalMatches, newMatch]);
                                setOngoingFinalMatches(ongoingFinalMatches.filter(m => m.type !== 'finale'));
                                setFinishingMatch(null);
                                setQuickResult({ score1: '', score2: '' });
                                
                                // Mostra messaggio di vittoria
                                setTimeout(() => {
                                  setSuccessMessage(`🎉 TORNEO CONCLUSO! 🎉\n\nVincitore:\n${newMatch.winner}\n\nComplimenti! 🏆`);
                                  setShowSuccessModal(true);
                                }, 500);
                              }}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-5 rounded-lg transition-all text-lg"
                            >
                              ✓ Salva Finale
                            </button>
                            <button
                              onClick={() => {
                                setFinishingMatch(null);
                                setQuickResult({ score1: '', score2: '' });
                              }}
                              className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold py-5 rounded-lg transition-all text-lg"
                            >
                              ✕ Annulla
                            </button>
                          </div>
                        </div>
                      ) : finaleResult ? (
                        <div className="max-w-2xl mx-auto">
                          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-8 mb-6 text-center border-4 border-yellow-400 shadow-2xl">
                            <div className="text-6xl mb-4">🏆</div>
                            <h3 className="text-3xl font-bold text-white mb-2">VINCITORE</h3>
                            <p className="text-5xl font-bold text-white mb-4">{finaleResult.winner}</p>
                            <div className="text-4xl font-bold text-white/90 mb-2">
                              {finaleResult.score1} - {finaleResult.score2}
                            </div>
                            {finaleResult.duration && (
                              <p className="text-white/80 text-lg mt-3">
                                Durata finale: {Math.floor(finaleResult.duration / 60)}:{(finaleResult.duration % 60).toString().padStart(2, '0')}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-3 bg-white/10 rounded-xl p-6">
                            <h4 className="text-xl font-bold text-white text-center mb-4">Dettaglio Finale</h4>
                            <div className={`text-white font-semibold bg-black/20 p-4 rounded text-center ${
                              finaleResult.winner === finaleTeam1 ? 'border-2 border-yellow-400' : ''
                            }`}>
                              {finaleTeam1} {finaleResult.winner === finaleTeam1 && '👑'}
                            </div>
                            <div className="text-center text-white/90 font-bold text-xl">VS</div>
                            <div className={`text-white font-semibold bg-black/20 p-4 rounded text-center ${
                              finaleResult.winner === finaleTeam2 ? 'border-2 border-yellow-400' : ''
                            }`}>
                              {finaleTeam2} {finaleResult.winner === finaleTeam2 && '👑'}
                            </div>
                            
                            {userRole === 'organizer' && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Eliminare il risultato della finale?')) {
                                    setFinalMatches(finalMatches.filter(m => m.type !== 'finale'));
                                  }
                                }}
                                className="w-full mt-4 bg-red-500/20 hover:bg-red-500/40 text-red-400 py-3 rounded-lg transition-all border border-red-400/50 font-semibold flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Elimina Risultato Finale
                              </button>
                            )}
                          </div>
                        </div>
                      ) : finaleOngoing ? (
                        <div className="max-w-2xl mx-auto space-y-4">
                          <div className="text-white font-semibold bg-black/20 p-5 rounded-lg text-center text-xl">
                            {finaleTeam1}
                          </div>
                          <div className="text-center text-white/90 font-bold text-2xl">VS</div>
                          <div className="text-white font-semibold bg-black/20 p-5 rounded-lg text-center text-xl">
                            {finaleTeam2}
                          </div>
                          {userRole === 'organizer' && (
                            <button
                              onClick={() => {
                                setFinishingMatch({ type: 'finale' });
                                setQuickResult({ score1: '', score2: '' });
                              }}
                              className="w-full bg-white/30 hover:bg-white/40 text-white font-bold py-5 rounded-lg transition-all border-2 border-gray-400 text-lg"
                            >
                              🏁 Finale Completata
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="max-w-2xl mx-auto space-y-4">
                          <div className="text-white font-semibold bg-black/20 p-5 rounded-lg text-center text-xl">
                            {finaleTeam1}
                          </div>
                          <div className="text-center text-white/90 font-bold text-2xl">VS</div>
                          <div className="text-white font-semibold bg-black/20 p-5 rounded-lg text-center text-xl">
                            {finaleTeam2}
                          </div>
                          {userRole === 'organizer' && (
                            <button
                              onClick={() => {
                                setOngoingFinalMatches([...ongoingFinalMatches, {
                                  type: 'finale',
                                  team1: finaleTeam1,
                                  team2: finaleTeam2,
                                  startTime: Date.now()
                                }]);
                              }}
                              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg text-base flex items-center justify-center gap-2"
                            >
                              <Play className="w-5 h-5" />
                              Avvia Finale
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Regolamento */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-3">📋 Regolamento</h3>
          <ul className="text-white/90 space-y-2">
            <li>• Due gironi da 5 squadre</li>
            <li>• 1 set vantaggio / killer point</li>
            <li>• 5 pari: tie break a 7</li>
            <li>• Semifinali: 1 set vantaggio / killer point</li>
            <li>• Finalissima: 1 set vantaggio / killer point</li>
            <li>• Passano i primi due del medesimo girone</li>
            <li>• Criteri: scontri diretti / differenza game</li>
          </ul>
        </div>
      </div>

      {/* Modal Conferma Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 max-w-md w-full border-2 border-white/30 shadow-2xl">
            <div className="text-center mb-6">
              <LogOut className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Conferma Uscita</h3>
              <p className="text-white/70">Sei sicuro di voler uscire?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-white/20 hover:bg-white text-gray-900 font-bold py-3 rounded-lg transition-all border border-white/30"
              >
                Annulla
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Reset Torneo */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-red-900 to-orange-900 rounded-2xl p-6 max-w-lg w-full border-2 border-red-400/50 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Trash2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">⚠️ ATTENZIONE - RESET COMPLETO ⚠️</h3>
              <div className="text-left bg-black/30 rounded-lg p-4 mb-4">
                <p className="text-white font-semibold mb-2">Questa azione cancellerà DEFINITIVAMENTE:</p>
                <ul className="text-white/90 space-y-1 text-sm">
                  <li>✗ Tutti i nomi delle squadre (ripristina originali)</li>
                  <li>✗ Tutti i risultati delle partite</li>
                  <li>✗ Tutte le presenze registrate</li>
                  <li>✗ Tutte le partite in corso</li>
                  <li>✗ Tutte le statistiche</li>
                  <li>✗ I dati salvati condivisi</li>
                </ul>
              </div>
              <p className="text-white font-bold text-lg">SEI ASSOLUTAMENTE SICURO?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-white/20 hover:bg-white text-gray-900 font-bold py-3 rounded-lg transition-all border border-white/30"
              >
                ❌ Annulla
              </button>
              <button
                onClick={resetTournamentCompletely}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
              >
                🔄 SÌ, RESETTA TUTTO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Successo */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 rounded-2xl p-6 max-w-md w-full border-2 border-green-400/50 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">✓</span>
              </div>
              <p className="text-white text-lg whitespace-pre-line mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PadelTournament;