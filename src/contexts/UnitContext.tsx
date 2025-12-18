import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Unit {
  id: string;
  serialNo: string;
  location: string;
  fillLevel: number;
  batteryLevel: number;
  status: 'active' | 'maintenance' | 'offline';
  lastSeen: string;
  coordinates: [number, number];
}

interface UnitContextType {
  units: Unit[];
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (id: string, updates: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;
  getUnit: (id: string) => Unit | undefined;
  getUnitsByStatus: (status: Unit['status']) => Unit[];
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('units');
    const defaultUnits: Unit[] = [
      {
        id: '1',
        serialNo: 'ST-001',
        location: 'Westlands',
        fillLevel: 85,
        batteryLevel: 92,
        status: 'active',
        lastSeen: '2 min ago',
        coordinates: [-1.2641, 36.8078]
      },
      {
        id: '2',
        serialNo: 'ST-002',
        location: 'CBD',
        fillLevel: 45,
        batteryLevel: 78,
        status: 'active',
        lastSeen: '5 min ago',
        coordinates: [-1.2921, 36.8219]
      },
      {
        id: '3',
        serialNo: 'ST-003',
        location: 'Karen',
        fillLevel: 92,
        batteryLevel: 15,
        status: 'maintenance',
        lastSeen: '1 hour ago',
        coordinates: [-1.3197, 36.6859]
      },
      {
        id: '4',
        serialNo: 'ST-004',
        location: 'Kilimani',
        fillLevel: 23,
        batteryLevel: 88,
        status: 'active',
        lastSeen: '3 min ago',
        coordinates: [-1.2906, 36.7820]
      }
    ];
    
    return saved ? JSON.parse(saved) : defaultUnits;
  });

  // Save to localStorage whenever units change
  const saveUnits = useCallback((updatedUnits: Unit[]) => {
    setUnits(updatedUnits);
    localStorage.setItem('units', JSON.stringify(updatedUnits));
  }, []);

  const addUnit = useCallback((unit: Omit<Unit, 'id'>) => {
    const newUnit = {
      ...unit,
      id: Date.now().toString(),
    };
    saveUnits([...units, newUnit]);
  }, [units, saveUnits]);

  const updateUnit = useCallback((id: string, updates: Partial<Unit>) => {
    saveUnits(units.map(unit => 
      unit.id === id ? { ...unit, ...updates } : unit
    ));
  }, [units, saveUnits]);

  const deleteUnit = useCallback((id: string) => {
    saveUnits(units.filter(unit => unit.id !== id));
  }, [units, saveUnits]);

  const getUnit = useCallback((id: string) => {
    return units.find(unit => unit.id === id);
  }, [units]);

  const getUnitsByStatus = useCallback((status: Unit['status']) => {
    return units.filter(unit => unit.status === status);
  }, [units]);

  return (
    <UnitContext.Provider 
      value={{
        units,
        addUnit,
        updateUnit,
        deleteUnit,
        getUnit,
        getUnitsByStatus
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};

export const useUnits = () => {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitProvider');
  }
  return context;
};

export default UnitContext;
