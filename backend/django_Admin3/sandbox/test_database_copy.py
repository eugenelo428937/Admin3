#!/usr/bin/env python
"""
Test for database copying functionality from ACTEDDBDEVOLD to ACTEDDBDEV01
"""

import unittest
from unittest.mock import patch, MagicMock, call
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


class TestDatabaseCopy(unittest.TestCase):
    """Test database copying functionality"""
    
    @patch('copy_database_data.psycopg2.connect')
    def test_copy_acted_products_connects_to_databases(self, mock_connect):
        """Test that copy_acted_products connects to both source and target databases"""
        from copy_database_data import copy_acted_products
        
        # Setup mocks
        mock_source_conn = MagicMock()
        mock_target_conn = MagicMock()
        mock_source_cursor = MagicMock()
        mock_target_cursor = MagicMock()
        
        mock_source_conn.cursor.return_value = mock_source_cursor
        mock_target_conn.cursor.return_value = mock_target_cursor
        
        # Configure mock to return different connections for source and target
        mock_connect.side_effect = [mock_source_conn, mock_target_conn]
        
        # Configure cursor to return columns and empty data
        mock_source_cursor.fetchall.return_value = [
            {'column_name': 'id'},
            {'column_name': 'fullname'},
            {'column_name': 'shortname'},
            {'column_name': 'code'}
        ]
        mock_source_cursor.fetchone.return_value = {'count': 0}  # No rows to copy
        
        # Call the function
        result = copy_acted_products()
        
        # Verify connections were made to both databases
        self.assertEqual(mock_connect.call_count, 2)
        
        # Verify connections were closed
        mock_source_conn.close.assert_called_once()
        mock_target_conn.close.assert_called_once()
    
    @patch('copy_database_data.psycopg2.connect')  
    def test_copy_acted_products_preserves_ids(self, mock_connect):
        """Test that copying acted_products preserves original IDs"""
        from copy_database_data import copy_acted_products
        
        # Setup mocks
        mock_source_conn = MagicMock()
        mock_target_conn = MagicMock()
        mock_source_cursor = MagicMock()
        mock_target_cursor = MagicMock()
        
        mock_source_conn.cursor.return_value = mock_source_cursor
        mock_target_conn.cursor.return_value = mock_target_cursor
        
        mock_connect.side_effect = [mock_source_conn, mock_target_conn]
        
        # Mock column data
        mock_source_cursor.fetchall.side_effect = [
            # First call - get columns
            [
                {'column_name': 'id'},
                {'column_name': 'fullname'},
                {'column_name': 'shortname'},
                {'column_name': 'code'}
            ],
            # Second call - get data rows with specific IDs
            [
                {'id': 42, 'fullname': 'Test Product', 'shortname': 'TP', 'code': 'TP001'},
                {'id': 99, 'fullname': 'Another Product', 'shortname': 'AP', 'code': 'AP001'}
            ],
            # Third call - no more rows
            []
        ]
        
        # Mock count query
        mock_source_cursor.fetchone.side_effect = [
            {'count': 2},  # Total rows
            [None],  # Sequence query result
            [99]  # Max ID for sequence reset
        ]
        
        # Call the function
        result = copy_acted_products()
        
        # Verify that INSERT statements were called with the preserved IDs
        insert_calls = [call for call in mock_target_cursor.execute.call_args_list 
                       if call[0][0] and 'INSERT' in call[0][0]]
        
        # Should have 2 INSERT calls for our 2 rows
        self.assertEqual(len(insert_calls), 2)
        
        # Verify the IDs were preserved in the INSERT values
        # First INSERT should have ID 42
        self.assertEqual(insert_calls[0][0][1][0], 42)
        # Second INSERT should have ID 99
        self.assertEqual(insert_calls[1][0][1][0], 99)

if __name__ == "__main__":
    unittest.main()